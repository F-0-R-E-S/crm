export interface FallbackTriggers {
  timeoutMs: number;
  httpStatusCodes: number[];
  connectionError: boolean;
  explicitReject: boolean;
}
export interface FallbackStepSpec {
  fromNodeId: string;
  toNodeId: string;
  hopOrder: number;
  triggers: FallbackTriggers;
}

export interface PushResultSnapshot {
  httpStatus?: number;
  error?: string;
  rejectReason?: string | null;
  durationMs?: number;
  connectionError?: boolean;
}

export type TriggerVerdict = "ok" | "failover" | "terminal";
export type TriggerClassifier = (
  r: PushResultSnapshot,
  triggers?: FallbackTriggers,
) => TriggerVerdict;

export function classifyPushResult(
  r: PushResultSnapshot,
  triggers?: FallbackTriggers,
): TriggerVerdict {
  if (r.connectionError && (triggers?.connectionError ?? true)) return "failover";
  if (r.durationMs && triggers?.timeoutMs && r.durationMs >= triggers.timeoutMs) return "failover";
  if (r.httpStatus && (triggers?.httpStatusCodes ?? []).includes(r.httpStatus)) return "failover";
  if (r.rejectReason && (triggers?.explicitReject ?? true)) return "failover";
  if (r.httpStatus && r.httpStatus >= 200 && r.httpStatus < 300) return "ok";
  return "terminal";
}

export function buildFallbackPlan(
  fromNodeId: string,
  steps: FallbackStepSpec[],
  maxHop: number,
): FallbackStepSpec[] {
  const byFrom = new Map<string, FallbackStepSpec[]>();
  for (const s of steps) {
    if (!byFrom.has(s.fromNodeId)) byFrom.set(s.fromNodeId, []);
    byFrom.get(s.fromNodeId)?.push(s);
  }
  const plan: FallbackStepSpec[] = [];
  let cursor = fromNodeId;
  const visited = new Set<string>([cursor]);
  while (plan.length < maxHop) {
    const candidates = (byFrom.get(cursor) ?? []).sort((a, b) => a.hopOrder - b.hopOrder);
    const next = candidates.find((s) => !visited.has(s.toNodeId));
    if (!next) break;
    plan.push(next);
    visited.add(next.toNodeId);
    cursor = next.toNodeId;
  }
  return plan;
}

export function detectFallbackCycle(
  steps: FallbackStepSpec[],
): { ok: true } | { ok: false; cycleStart: string } {
  const adj = new Map<string, string[]>();
  for (const s of steps) {
    if (!adj.has(s.fromNodeId)) adj.set(s.fromNodeId, []);
    adj.get(s.fromNodeId)?.push(s.toNodeId);
  }
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const node of adj.keys()) color.set(node, WHITE);
  for (const tos of adj.values()) for (const t of tos) if (!color.has(t)) color.set(t, WHITE);

  const dfs = (u: string): string | null => {
    color.set(u, GREY);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v);
      if (c === GREY) return v;
      if (c === WHITE) {
        const hit = dfs(v);
        if (hit) return hit;
      }
    }
    color.set(u, BLACK);
    return null;
  };

  for (const node of color.keys()) {
    if (color.get(node) === WHITE) {
      const hit = dfs(node);
      if (hit) return { ok: false, cycleStart: hit };
    }
  }
  return { ok: true };
}
