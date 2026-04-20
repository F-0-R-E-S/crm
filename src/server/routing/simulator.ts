import { type EngineDecision, type LeadSnapshot, executeFlow } from "./engine";

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
