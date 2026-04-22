// ComparingSplit → Algorithm(WRR) + FlowAlgorithmConfig compiler.
// A ComparingSplit node is a publish-time macro that expresses "split N
// ways with these shares, record per-branch metrics, flag a winner once
// each branch clears sampleSize".
//
// At runtime it's a plain WRR pick — the comparison data is collected
// out-of-band by ComparingBucketStat writes keyed off the chosen branch
// node id. The algorithm config JSON carries enough metadata for the
// canvas UI to render the comparison widget and for the analytics
// layer to compute the winner.

import type { AlgorithmNode, ComparingSplitNode } from "./model";

export interface CompiledComparingSplit {
  /** The Algorithm(WRR) node that replaces the ComparingSplit at
   *  runtime; caller adds to the graph's node list. */
  algoNode: AlgorithmNode;
  /** JSON payload for a `FlowAlgorithmConfig` row of
   *  `scope: BRANCH, scopeRefId: algoNode.id`. */
  algoConfigParams: Record<string, unknown>;
  /** Per-branch weight list, derived from shares × 1000. Caller zips
   *  these onto the BrokerTarget children inside the branch. */
  weights: Array<{ nodeId: string; weight: number }>;
}

export class ComparingCompileError extends Error {
  constructor(
    message: string,
    public readonly code: "too_few_branches" | "shares_dont_sum" | "share_out_of_range",
  ) {
    super(message);
  }
}

const SHARE_SUM_EPSILON = 0.001;

/**
 * Compile a ComparingSplit into a WRR algo node + weights + config
 * payload. Shares must be strictly positive and sum to 1 ± 0.001.
 * Branch count must be 2..4 (matches iREV's Comparing Folder limits).
 */
export function comparingSplitToAlgoConfig(
  node: ComparingSplitNode,
  branches: Array<{ nodeId: string; share: number }>,
): CompiledComparingSplit {
  if (branches.length < 2 || branches.length > 4) {
    throw new ComparingCompileError(
      `ComparingSplit requires 2..4 branches (got ${branches.length})`,
      "too_few_branches",
    );
  }
  for (const b of branches) {
    if (b.share <= 0 || b.share > 1) {
      throw new ComparingCompileError(
        `branch share must be > 0 and ≤ 1 (got ${b.share} for ${b.nodeId})`,
        "share_out_of_range",
      );
    }
  }
  const total = branches.reduce((acc, b) => acc + b.share, 0);
  if (Math.abs(total - 1) > SHARE_SUM_EPSILON) {
    throw new ComparingCompileError(
      `branch shares must sum to 1 ± ${SHARE_SUM_EPSILON} (got ${total.toFixed(4)})`,
      "shares_dont_sum",
    );
  }

  const weights = branches.map((b) => ({
    nodeId: b.nodeId,
    weight: Math.max(1, Math.round(b.share * 1000)),
  }));

  const algoNode: AlgorithmNode = {
    id: `${node.id}_wrr`,
    kind: "Algorithm",
    mode: "WEIGHTED_ROUND_ROBIN",
    label: `Comparing · ${node.compareMetric}`,
  };

  const algoConfigParams = {
    compareMetric: node.compareMetric,
    sampleSize: node.sampleSize,
    isComparison: true,
    sourceComparingNodeId: node.id,
    branches: weights,
  };

  return { algoNode, algoConfigParams, weights };
}
