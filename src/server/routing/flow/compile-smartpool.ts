// SmartPool → FallbackStep chain compiler. A SmartPool node is a
// publish-time macro: at publish we walk the ranked children (ordered by
// the outgoing edges' `rank` metadata, falling back to edge insertion
// order) and emit `(child[i] → child[i+1], hopOrder=i, triggers)` rows.
//
// The runtime engine is unchanged: push-lead already consumes
// FallbackStep with `classifyPushResult` → next hop. All we do here is
// translate the authoring-side pool shape into that runtime shape.
//
// Pool semantics (matches iREV's SMART Folder):
//   - child #1 is tried first
//   - if `classifyPushResult(result, triggers)` says "failover", hop to child #2
//   - up to pool.maxHop attempts total (incl. the initial attempt)
//   - a failover means the pool *selects* child #1 on entry, not that
//     the engine first tries, then walks. The graph wires the Algorithm
//     / parent upstream node directly to child #1; siblings are only
//     reached via the compiled fallback chain.

import type { FallbackStepSpec } from "../fallback/orchestrator";
import type { FallbackTriggers, SmartPoolNode } from "./model";

export interface CompiledSmartPool {
  /** The broker-target node id that should be wired as the pool's
   *  "primary" — i.e. the node upstream edges target. */
  primaryNodeId: string | null;
  /** FallbackStep rows for the compiled chain. `length === ranked.length - 1`
   *  for pools with ≥ 2 children; 0 for pools with 0 or 1 children. */
  steps: FallbackStepSpec[];
  /** The resolved triggers applied to every emitted step. */
  triggers: FallbackTriggers;
}

/**
 * Compile a SmartPool node + its ordered child id list into FallbackStep
 * rows. Children must already be sorted (caller's responsibility —
 * typically by ascending edge.rank then edge insertion order).
 */
export function smartPoolToFallbackSteps(
  pool: SmartPoolNode,
  rankedChildren: string[],
): CompiledSmartPool {
  const triggers = pool.triggers;
  if (rankedChildren.length === 0) {
    return { primaryNodeId: null, steps: [], triggers };
  }
  const primaryNodeId = rankedChildren[0] ?? null;
  // Chain: child[0] → child[1] → … → child[maxHop-1]
  // maxHop bounds the total hop count; with 5 children and maxHop=3 we
  // emit 3 fallback hops (0→1, 1→2, 2→3) so the chain walks three
  // siblings in order.
  const chainLength = Math.max(0, Math.min(rankedChildren.length - 1, pool.maxHop));
  const steps: FallbackStepSpec[] = [];
  for (let i = 0; i < chainLength; i++) {
    const from = rankedChildren[i];
    const to = rankedChildren[i + 1];
    if (!from || !to) break;
    steps.push({ fromNodeId: from, toNodeId: to, hopOrder: i, triggers });
  }
  return { primaryNodeId, steps, triggers };
}
