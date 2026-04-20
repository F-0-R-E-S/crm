import { prisma } from "@/server/db";
import type { FraudPolicyWeights } from "./fraud-score";

export interface FraudPolicy extends FraudPolicyWeights {
  id: string;
  name: string;
  autoRejectThreshold: number;
  borderlineMin: number;
  version: number;
}

const DEFAULT_POLICY: FraudPolicy = {
  id: "inline-default",
  name: "global",
  weightBlacklist: 40,
  weightGeoMismatch: 15,
  weightVoip: 20,
  weightDedupHit: 10,
  weightPatternHit: 15,
  autoRejectThreshold: 80,
  borderlineMin: 60,
  version: 0,
};

let cached: { at: number; policy: FraudPolicy } | null = null;
const TTL_MS = 30_000;

export async function getFraudPolicy(): Promise<FraudPolicy> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.policy;
  const row = await prisma.fraudPolicy.findUnique({ where: { name: "global" } });
  const policy: FraudPolicy = row
    ? {
        id: row.id,
        name: row.name,
        weightBlacklist: row.weightBlacklist,
        weightGeoMismatch: row.weightGeoMismatch,
        weightVoip: row.weightVoip,
        weightDedupHit: row.weightDedupHit,
        weightPatternHit: row.weightPatternHit,
        autoRejectThreshold: row.autoRejectThreshold,
        borderlineMin: row.borderlineMin,
        version: row.version,
      }
    : DEFAULT_POLICY;
  cached = { at: now, policy };
  return policy;
}

export function invalidateFraudPolicyCache() {
  cached = null;
}
