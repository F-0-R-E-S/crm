export type AlgorithmMode = "WEIGHTED_ROUND_ROBIN" | "SLOTS_CHANCE";

export interface AlgorithmSpec {
  mode: AlgorithmMode;
  params: Record<string, unknown>;
}

export interface ResolveInput {
  flowAlgorithm: AlgorithmSpec | null;
  branchAlgorithm: AlgorithmSpec | null;
}

export interface ResolvedAlgorithm {
  mode: AlgorithmMode;
  params: Record<string, unknown>;
  source: "flow" | "branch";
}

export function resolveAlgorithm(input: ResolveInput): ResolvedAlgorithm {
  if (input.branchAlgorithm) return { ...input.branchAlgorithm, source: "branch" };
  if (input.flowAlgorithm) return { ...input.flowAlgorithm, source: "flow" };
  throw new Error("algorithm_not_configured");
}
