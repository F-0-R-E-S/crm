import { prisma } from "@/server/db";
import type { FallbackStep } from "@prisma/client";
import { type EngineDecision, type LeadSnapshot, executeFlow } from "./engine";
import { rankedBrokerChildren, smartPoolNodes } from "./flow/graph-walker";
import type { FlowGraph } from "./flow/model";

export interface SimulateInput {
  flowId: string;
  leadPayload: Partial<LeadSnapshot> & { geo: string; affiliateId: string };
  now?: Date;
}

export interface SimulateExplain {
  selected_target: string | null;
  selected_broker_id: string | null;
  algorithm_used: EngineDecision["algorithmUsed"] | null;
  algorithm_source: EngineDecision["algorithmSource"] | null;
  filters_applied: Array<{ step: string; node_id?: string; ok: boolean; detail?: unknown }>;
  fallback_path: Array<{ from: string; to: string; reason: string }>;
  outcome: EngineDecision["outcome"];
  reason: EngineDecision["reason"] | null;
  decision_time_ms: number;
  trace_token: string | null;
  flow_version_id: string;
}

export async function simulateRoute(input: SimulateInput): Promise<SimulateExplain> {
  const lead: LeadSnapshot = {
    id: "simulate",
    affiliateId: input.leadPayload.affiliateId,
    geo: input.leadPayload.geo,
    subId: input.leadPayload.subId,
    utm: input.leadPayload.utm,
  };
  const dec = await executeFlow({
    flowId: input.flowId,
    lead,
    mode: "dryRun",
    now: input.now,
  });
  return {
    selected_target: dec.selectedNodeId ?? null,
    selected_broker_id: dec.selectedBrokerId ?? null,
    algorithm_used: dec.algorithmUsed ?? null,
    algorithm_source: dec.algorithmSource ?? null,
    filters_applied: dec.trace.stepsApplied.map((s) => ({
      step: s.step,
      node_id: s.nodeId,
      ok: s.ok,
      detail: s.detail,
    })),
    fallback_path: [],
    outcome: dec.outcome,
    reason: dec.reason ?? null,
    decision_time_ms: dec.decisionTimeMs,
    trace_token: dec.trace.traceToken ?? null,
    flow_version_id: dec.trace.flowVersionId,
  };
}

// ============================================================================
// Batch simulation — runs N synthetic leads through the flow and simulates
// broker acceptance per provided probabilities. The key value of the batch
// mode is verifying SmartPool sequential-accept scenarios: if broker-A
// always rejects and broker-C always accepts, every batch decision's
// trace must show A → B → C attempts in order.
// ============================================================================

export interface BatchSimulateInput {
  flowId: string;
  count: number;
  /** Per-broker accept probability in [0, 1]. Unlisted brokers default
   *  to 1 (always accept). */
  brokerAcceptProbabilities?: Record<string, number>;
  /** Template used to synthesize each lead. `geo` and `affiliateId`
   *  required; other fields optional. */
  leadTemplate: Partial<LeadSnapshot> & { geo: string; affiliateId: string };
  now?: Date;
  /** Override random draw for determinism in tests. Must return a
   *  value in [0, 1). Defaults to Math.random. */
  randomFn?: () => number;
}

export interface BatchAttemptTrace {
  hopOrder: number;
  brokerId: string;
  nodeId: string;
  accepted: boolean;
}

export interface BatchSampleTrace {
  leadIndex: number;
  attempts: BatchAttemptTrace[];
  landedBrokerId: string | null;
  landedNodeId: string | null;
  outcome: "accepted" | "exhausted" | "no_route";
}

export interface BatchSimulateResult {
  count: number;
  perBrokerAccepts: Record<string, number>;
  perBrokerRejects: Record<string, number>;
  noRoute: number;
  exhausted: number;
  meanDecisionMs: number;
  sampleTraces: BatchSampleTrace[];
}

/**
 * Batch simulator. For each synthetic lead:
 *   1. Run `executeFlow` in dryRun mode to pick the primary broker.
 *   2. Roll a random [0,1) number against the broker's accept
 *      probability. If accepted, record and continue.
 *   3. If rejected and the flow has a SmartPool, walk the FallbackStep
 *      chain (pool-derived) trying each sibling in rank order until
 *      accepted or exhausted.
 *   4. Record the per-broker accept/reject tallies and a sample of the
 *      first 10 traces for UI surfacing.
 */
export async function simulateBatch(input: BatchSimulateInput): Promise<BatchSimulateResult> {
  const rand = input.randomFn ?? Math.random;
  const probs = input.brokerAcceptProbabilities ?? {};
  const acceptProbability = (brokerId: string): number =>
    brokerId in probs ? Math.max(0, Math.min(1, probs[brokerId] ?? 1)) : 1;

  // Pre-load the active flow version's graph + fallback chain once —
  // the engine does this on every call, but we can't drive the hop
  // chain from the engine alone. The simulator needs the compiled
  // FallbackStep rows to iterate on reject.
  const flow = await prisma.flow.findUnique({
    where: { id: input.flowId },
    include: { activeVersion: true },
  });
  if (!flow?.activeVersion) {
    return {
      count: input.count,
      perBrokerAccepts: {},
      perBrokerRejects: {},
      noRoute: input.count,
      exhausted: 0,
      meanDecisionMs: 0,
      sampleTraces: [],
    };
  }
  const graph = flow.activeVersion.graph as unknown as FlowGraph;
  const fallbackSteps = await prisma.fallbackStep.findMany({
    where: { flowVersionId: flow.activeVersion.id },
    orderBy: [{ fromNodeId: "asc" }, { hopOrder: "asc" }],
  });
  // Map of nodeId → BrokerTarget.brokerId for fast lookup during
  // the hop chain.
  const nodeIdToBrokerId = new Map<string, string>();
  const nodeIdToBrokerTarget = new Map<string, string>();
  for (const n of graph.nodes) {
    if (n.kind === "BrokerTarget") {
      nodeIdToBrokerId.set(n.id, n.brokerId);
      nodeIdToBrokerTarget.set(n.id, n.id);
    }
  }
  // For SmartPool chains: adjacency from fromNodeId → toNodeId (picking
  // the first step by hopOrder). Only one "next" hop per source — the
  // compile-smartpool output guarantees this.
  const nextHopByFrom = new Map<string, string>();
  for (const s of fallbackSteps as FallbackStep[]) {
    if (!nextHopByFrom.has(s.fromNodeId)) {
      nextHopByFrom.set(s.fromNodeId, s.toNodeId);
    }
  }

  // Membership: which nodeIds are SmartPool children? (Hop chains only
  // apply inside a pool; outside, a reject is terminal for the batch.)
  const poolMembers = new Set<string>();
  for (const pool of smartPoolNodes(graph)) {
    for (const id of rankedBrokerChildren(graph, pool.id)) poolMembers.add(id);
  }

  const perBrokerAccepts: Record<string, number> = {};
  const perBrokerRejects: Record<string, number> = {};
  let noRoute = 0;
  let exhausted = 0;
  let totalMs = 0;
  const sampleTraces: BatchSampleTrace[] = [];

  for (let i = 0; i < input.count; i++) {
    const lead: LeadSnapshot = {
      id: `sim-${i}`,
      affiliateId: input.leadTemplate.affiliateId,
      geo: input.leadTemplate.geo,
      subId: input.leadTemplate.subId,
      utm: input.leadTemplate.utm,
    };
    const dec = await executeFlow({
      flowId: input.flowId,
      lead,
      mode: "dryRun",
      now: input.now,
    });
    totalMs += dec.decisionTimeMs;
    if (dec.outcome !== "selected" || !dec.selectedBrokerId || !dec.selectedNodeId) {
      noRoute += 1;
      if (sampleTraces.length < 10) {
        sampleTraces.push({
          leadIndex: i,
          attempts: [],
          landedBrokerId: null,
          landedNodeId: null,
          outcome: "no_route",
        });
      }
      continue;
    }
    // Walk sequential attempts. Start at the selected node; if it
    // rejects and it's a pool member, hop to the next sibling; otherwise
    // record the terminal reject.
    const attempts: BatchAttemptTrace[] = [];
    let cursorNodeId: string | null = dec.selectedNodeId;
    let cursorBrokerId: string | null = dec.selectedBrokerId;
    let landed = false;
    while (cursorNodeId && cursorBrokerId) {
      const accept = rand() < acceptProbability(cursorBrokerId);
      attempts.push({
        hopOrder: attempts.length,
        brokerId: cursorBrokerId,
        nodeId: cursorNodeId,
        accepted: accept,
      });
      if (accept) {
        perBrokerAccepts[cursorBrokerId] = (perBrokerAccepts[cursorBrokerId] ?? 0) + 1;
        landed = true;
        break;
      }
      perBrokerRejects[cursorBrokerId] = (perBrokerRejects[cursorBrokerId] ?? 0) + 1;
      if (!poolMembers.has(cursorNodeId)) break;
      const nextNode = nextHopByFrom.get(cursorNodeId);
      if (!nextNode) break;
      cursorNodeId = nextNode;
      cursorBrokerId = nodeIdToBrokerId.get(nextNode) ?? null;
    }
    if (!landed) exhausted += 1;
    if (sampleTraces.length < 10) {
      sampleTraces.push({
        leadIndex: i,
        attempts,
        landedBrokerId:
          landed && attempts.length > 0 ? (attempts[attempts.length - 1]?.brokerId ?? null) : null,
        landedNodeId:
          landed && attempts.length > 0 ? (attempts[attempts.length - 1]?.nodeId ?? null) : null,
        outcome: landed ? "accepted" : "exhausted",
      });
    }
  }

  return {
    count: input.count,
    perBrokerAccepts,
    perBrokerRejects,
    noRoute,
    exhausted,
    meanDecisionMs: input.count > 0 ? totalMs / input.count : 0,
    sampleTraces,
  };
}
