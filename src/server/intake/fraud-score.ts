export type FraudSignalKind = "blacklist" | "geo_mismatch" | "voip" | "dedup_hit" | "pattern_hit";

export interface FraudSignal {
  kind: FraudSignalKind;
  detail?: Record<string, unknown>;
}

export interface FiredSignal extends FraudSignal {
  weight: number;
}

export interface FraudPolicyWeights {
  weightBlacklist: number;
  weightGeoMismatch: number;
  weightVoip: number;
  weightDedupHit: number;
  weightPatternHit: number;
}

export interface FraudScoreResult {
  score: number;
  fired: FiredSignal[];
}

const WEIGHT_KEY: Record<FraudSignalKind, keyof FraudPolicyWeights> = {
  blacklist: "weightBlacklist",
  geo_mismatch: "weightGeoMismatch",
  voip: "weightVoip",
  dedup_hit: "weightDedupHit",
  pattern_hit: "weightPatternHit",
};

export function computeFraudScore(
  signals: readonly FraudSignal[],
  policy: FraudPolicyWeights,
): FraudScoreResult {
  const fired: FiredSignal[] = [];
  let raw = 0;
  for (const s of signals) {
    const key = WEIGHT_KEY[s.kind];
    if (!key) continue;
    const weight = policy[key];
    fired.push({ ...s, weight });
    raw += weight;
  }
  return { score: Math.min(100, Math.max(0, raw)), fired };
}
