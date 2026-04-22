import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { resolveAlgorithm } from "./algorithm/selector";
import { selectBySlotsOrChance } from "./algorithm/slots-chance";
import { selectWeighted } from "./algorithm/wrr";
import { consumeCap } from "./constraints/caps";
import { evaluateGeo } from "./constraints/geo";
import { type Schedule, evaluateSchedule } from "./constraints/schedule";
import { brokerToComparingSplit, rankedBrokerChildren } from "./flow/graph-walker";
import type { FlowGraph } from "./flow/model";
import { evaluatePqlGate } from "./pql/evaluate";

export type ExecutionMode = "execute" | "dryRun";

export interface LeadSnapshot {
  id: string;
  affiliateId: string;
  geo: string;
  subId?: string;
  utm?: Record<string, unknown>;
}

export interface EngineDecision {
  outcome: "selected" | "no_route" | "error";
  selectedBrokerId?: string;
  selectedNodeId?: string;
  /** Set when the selected node is a SmartPool child — identifies the
   *  pool so push-lead knows the chain was selected via sequential
   *  ranking (vs. an algorithm pick). */
  selectedSmartPoolId?: string;
  /** Set when the selected node is a ComparingSplit branch — used by
   *  the post-decision hook to attribute the decision to a bucket. */
  selectedComparingSplitId?: string;
  reason?:
    | "entry_filter"
    | "branch_filter"
    | "cap_exhausted"
    | "outside_hours"
    | "no_targets"
    | "algorithm_error"
    | "pql_gate";
  algorithmUsed?: "weighted_round_robin" | "slots_chance" | "smart_pool";
  algorithmSource?: "flow" | "branch" | "pool";
  trace: {
    flowVersionId: string;
    stepsApplied: Array<{
      step: string;
      nodeId?: string;
      ok: boolean;
      detail?: Record<string, unknown>;
    }>;
    traceToken?: string;
  };
  decisionTimeMs: number;
}

interface ExecuteInput {
  flowId: string;
  lead: LeadSnapshot;
  mode: ExecutionMode;
  now?: Date;
}

function matchCondition(
  cond: { field: string; sign?: string; op?: string; value: unknown; caseSensitive?: boolean },
  lead: LeadSnapshot,
): boolean {
  const field = cond.field as keyof LeadSnapshot;
  let left: unknown;
  if (cond.field === "utm_source") left = lead.utm?.source;
  else if (cond.field === "utm_medium") left = lead.utm?.medium;
  else left = (lead as unknown as Record<string, unknown>)[field];
  const v = cond.value;
  // Accept either new `sign` or legacy `op` for in-place call sites.
  const sign = cond.sign ?? cond.op ?? "eq";
  switch (sign) {
    case "eq":
      return String(left) === String(v);
    case "neq":
      return String(left) !== String(v);
    case "in":
      return Array.isArray(v) && (v as unknown[]).includes(left);
    case "not_in":
      return Array.isArray(v) && !(v as unknown[]).includes(left);
    case "matches":
      return typeof left === "string" && typeof v === "string" && new RegExp(v).test(left);
    default:
      return false;
  }
}

export async function executeFlow(input: ExecuteInput): Promise<EngineDecision> {
  const startedAt = performance.now();
  const steps: EngineDecision["trace"]["stepsApplied"] = [];

  const flow = await prisma.flow.findUnique({
    where: { id: input.flowId },
    include: {
      activeVersion: {
        include: {
          capDefs: { include: { countryLimits: true } },
          branches: true,
          algoConfigs: true,
        },
      },
    },
  });
  if (!flow || !flow.activeVersion) {
    return {
      outcome: "error",
      reason: "algorithm_error",
      trace: { flowVersionId: "", stepsApplied: [{ step: "load_flow", ok: false }] },
      decisionTimeMs: performance.now() - startedAt,
    };
  }
  const fv = flow.activeVersion;
  const graph = fv.graph as unknown as FlowGraph;

  const filterNode = graph.nodes.find((n) => n.kind === "Filter");
  if (filterNode && filterNode.kind === "Filter") {
    const logic = filterNode.logic;
    const results = filterNode.rules.map((c) => matchCondition(c, input.lead));
    const passed = logic === "AND" ? results.every(Boolean) : results.some(Boolean);
    steps.push({ step: "entry_filter", nodeId: filterNode.id, ok: passed });
    if (!passed) {
      return {
        outcome: "no_route",
        reason: "entry_filter",
        trace: { flowVersionId: fv.id, stepsApplied: steps },
        decisionTimeMs: performance.now() - startedAt,
      };
    }
  }

  const ef = fv.entryFilters as { allowed_geo?: string[]; blocked_geo?: string[] } | null;
  if (ef) {
    const g = evaluateGeo(input.lead.geo, {
      allowed: ef.allowed_geo ?? [],
      blocked: ef.blocked_geo ?? [],
    });
    steps.push({ step: "geo", ok: g.ok, detail: g.ok ? {} : { reason: g.reason } });
    if (!g.ok) {
      return {
        outcome: "no_route",
        reason: "branch_filter",
        trace: { flowVersionId: fv.id, stepsApplied: steps },
        decisionTimeMs: performance.now() - startedAt,
      };
    }
  }

  const flowAlgoCfg = fv.algoConfigs.find((c) => c.scope === "FLOW") ?? null;
  const resolved = resolveAlgorithm({
    flowAlgorithm: flowAlgoCfg
      ? { mode: flowAlgoCfg.mode, params: flowAlgoCfg.params as Record<string, unknown> }
      : { mode: "WEIGHTED_ROUND_ROBIN", params: {} },
    branchAlgorithm: null,
  });
  steps.push({
    step: "resolve_algorithm",
    ok: true,
    detail: { mode: resolved.mode, source: resolved.source },
  });

  const targetNodes = graph.nodes.filter((n) => n.kind === "BrokerTarget");
  if (targetNodes.length === 0) {
    return {
      outcome: "no_route",
      reason: "no_targets",
      trace: { flowVersionId: fv.id, stepsApplied: steps },
      decisionTimeMs: performance.now() - startedAt,
    };
  }

  // Precompute a lookup of BrokerTarget id → its parent ComparingSplit
  // (if any) — used to tag the decision with a branch identity for
  // post-decision metric attribution. SmartPool membership is rebuilt
  // from `rankedBrokerChildren` in the selection block below.
  const compareByBrokerId = brokerToComparingSplit(graph);

  const now = input.now ?? new Date();
  const available: typeof targetNodes = [];
  for (const t of targetNodes) {
    if (t.kind !== "BrokerTarget") continue;
    // Honor per-target `active` toggle — skip inactive targets up-front.
    if (t.active === false) {
      steps.push({ step: "active_check", nodeId: t.id, ok: false });
      continue;
    }
    // Per-target PQL gate. Evaluated BEFORE cap check so a PQL miss
    // doesn't consume cap slots.
    if (t.pqlGate) {
      const verdict = evaluatePqlGate(t.pqlGate.rules, t.pqlGate.logic, input.lead, now);
      if (!verdict.ok) {
        steps.push({
          step: "pql_gate",
          nodeId: t.id,
          ok: false,
          detail: {
            failed_rule_index: verdict.failedRuleIndex,
            field: verdict.failedField,
            sign: verdict.failedSign,
          },
        });
        continue;
      }
      steps.push({ step: "pql_gate", nodeId: t.id, ok: true });
    }
    const brokerCapDef = fv.capDefs.find(
      (d) => d.scope === "BROKER" && d.scopeRefId === t.brokerId,
    );

    if (brokerCapDef && input.mode === "execute") {
      // Resolve effective limit + bucket-country
      let effectiveLimit = brokerCapDef.limit;
      let bucketCountry = "";
      if (brokerCapDef.perCountry) {
        const leadCountry = input.lead.geo;
        if (!leadCountry) {
          steps.push({
            step: "cap_check",
            nodeId: t.id,
            ok: false,
            detail: { reason: "missing_country_for_per_country_cap" },
          });
          continue;
        }
        const entry = brokerCapDef.countryLimits.find((c) => c.country === leadCountry);
        if (!entry) {
          steps.push({
            step: "cap_check",
            nodeId: t.id,
            ok: false,
            detail: { reason: "no_limit_for_country", country: leadCountry },
          });
          continue;
        }
        effectiveLimit = entry.limit;
        bucketCountry = leadCountry;
      }

      const r = await consumeCap({
        scope: "BROKER",
        scopeId: t.brokerId,
        window: brokerCapDef.window,
        tz: brokerCapDef.timezone,
        limit: effectiveLimit,
        country: bucketCountry,
        now,
      });
      if (!r.ok) {
        steps.push({ step: "cap_check", nodeId: t.id, ok: false, detail: { reason: r.reason } });
        continue;
      }
      steps.push({
        step: "cap_check",
        nodeId: t.id,
        ok: true,
        detail: { remaining: r.remaining, country: bucketCountry || "TOTAL" },
      });
    }
    available.push(t);
  }

  if (available.length === 0) {
    return {
      outcome: "no_route",
      reason: "cap_exhausted",
      trace: { flowVersionId: fv.id, stepsApplied: steps },
      decisionTimeMs: performance.now() - startedAt,
    };
  }

  // SmartPool bias: if any AVAILABLE target is a SmartPool child, pick
  // the HIGHEST-RANKED child of that pool (i.e. the first in the pool's
  // outgoing-edge order that survived cap+gate checks). FallbackStep
  // rows compiled at publish time handle downstream retries to the
  // remaining siblings. If multiple pools are present, we pick the
  // first pool encountered in node order; nested pools are rejected at
  // publish time.
  for (const pool of graph.nodes.filter((n) => n.kind === "SmartPool")) {
    const ranked = rankedBrokerChildren(graph, pool.id);
    const availableIds = new Set(available.map((a) => a.id));
    const firstAvailable = ranked.find((id) => availableIds.has(id));
    if (firstAvailable) {
      const chosen = available.find((a) => a.id === firstAvailable);
      if (chosen && chosen.kind === "BrokerTarget") {
        steps.push({
          step: "smart_pool",
          nodeId: chosen.id,
          ok: true,
          detail: { pool_id: pool.id, rank: ranked.indexOf(firstAvailable) },
        });
        const decidedInMs = performance.now() - startedAt;
        logger.info({
          event: "routing.decision",
          flow_id: input.flowId,
          flow_version_id: fv.id,
          branch_id: chosen.id,
          algorithm: "smart_pool",
          algorithm_source: "pool",
          broker_id: chosen.brokerId,
          decided_in_ms: decidedInMs,
          pool_id: pool.id,
        });
        return {
          outcome: "selected",
          selectedBrokerId: chosen.brokerId,
          selectedNodeId: chosen.id,
          selectedSmartPoolId: pool.id,
          selectedComparingSplitId: compareByBrokerId.get(chosen.id)?.id,
          algorithmUsed: "smart_pool",
          algorithmSource: "pool",
          trace: { flowVersionId: fv.id, stepsApplied: steps },
          decisionTimeMs: decidedInMs,
        };
      }
    }
  }

  try {
    if (resolved.mode === "WEIGHTED_ROUND_ROBIN") {
      const targets = available.map((t) => {
        if (t.kind === "BrokerTarget") {
          return { id: t.id, weight: t.weight ?? 100, brokerId: t.brokerId };
        }
        return { id: "", weight: 0, brokerId: "" };
      });
      const pick = await selectWeighted(
        fv.id,
        targets.map((t) => ({ id: t.id, weight: t.weight })),
      );
      const chosen = targets.find((t) => t.id === pick.id);
      if (!chosen) throw new Error("algorithm_no_pick");
      steps.push({
        step: "algorithm",
        ok: true,
        detail: { mode: "wrr", traceToken: pick.traceToken },
      });
      const decidedInMs = performance.now() - startedAt;
      logger.info({
        event: "routing.decision",
        flow_id: input.flowId,
        flow_version_id: fv.id,
        branch_id: chosen.id,
        algorithm: "weighted_round_robin",
        algorithm_source: resolved.source,
        broker_id: chosen.brokerId,
        decided_in_ms: decidedInMs,
      });
      return {
        outcome: "selected",
        selectedBrokerId: chosen.brokerId,
        selectedNodeId: chosen.id,
        selectedComparingSplitId: compareByBrokerId.get(chosen.id)?.id,
        algorithmUsed: "weighted_round_robin",
        algorithmSource: resolved.source,
        trace: { flowVersionId: fv.id, stepsApplied: steps, traceToken: pick.traceToken },
        decisionTimeMs: decidedInMs,
      };
    }
    type ProbT = { id: string; brokerId: string } & ({ chance: number } | { slots: number });
    const probTargets: ProbT[] = [];
    for (const t of available) {
      if (t.kind !== "BrokerTarget") continue;
      if (t.chance != null) probTargets.push({ id: t.id, chance: t.chance, brokerId: t.brokerId });
      else probTargets.push({ id: t.id, slots: t.slots ?? 100, brokerId: t.brokerId });
    }
    const pick = await selectBySlotsOrChance(
      probTargets.map((t) =>
        "chance" in t ? { id: t.id, chance: t.chance } : { id: t.id, slots: t.slots },
      ) as never,
    );
    const chosen = probTargets.find((t) => t.id === pick.id);
    if (!chosen) throw new Error("algorithm_no_pick");
    steps.push({
      step: "algorithm",
      ok: true,
      detail: { mode: "slots_chance", traceToken: pick.traceToken },
    });
    const decidedInMsSlots = performance.now() - startedAt;
    logger.info({
      event: "routing.decision",
      flow_id: input.flowId,
      flow_version_id: fv.id,
      branch_id: chosen.id,
      algorithm: "slots_chance",
      algorithm_source: resolved.source,
      broker_id: chosen.brokerId,
      decided_in_ms: decidedInMsSlots,
    });
    return {
      outcome: "selected",
      selectedBrokerId: chosen.brokerId,
      selectedNodeId: chosen.id,
      selectedComparingSplitId: compareByBrokerId.get(chosen.id)?.id,
      algorithmUsed: "slots_chance",
      algorithmSource: resolved.source,
      trace: { flowVersionId: fv.id, stepsApplied: steps, traceToken: pick.traceToken },
      decisionTimeMs: decidedInMsSlots,
    };
  } catch (e) {
    logger.error({ err: e, flow_id: input.flowId }, "engine algorithm error");
    return {
      outcome: "error",
      reason: "algorithm_error",
      trace: { flowVersionId: fv.id, stepsApplied: steps },
      decisionTimeMs: performance.now() - startedAt,
    };
  }
}

export { evaluateSchedule };
export type { Schedule };
