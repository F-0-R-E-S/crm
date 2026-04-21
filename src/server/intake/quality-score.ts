import { prisma } from "@/server/db";

export interface AffiliateHistory {
  leadCount: number;
  ftdCount: number;
  rejectedCount: number;
  avgFraudScore: number | null;
}

export interface BrokerGeoStats {
  pushedCount: number;
  acceptedCount: number;
  acceptanceRate: number;
}

export interface QualityInput {
  fraudScore: number;
  signalKinds: readonly string[];
  affiliate: AffiliateHistory;
  brokerGeo: BrokerGeoStats | null;
}

export interface QualityResult {
  score: number;
  components: {
    fraudComponent: number;
    affiliateComponent: number;
    brokerGeoComponent: number;
  };
}

/**
 * Pure deterministic blend, no ML (v2.5 lands ML).
 *   fraud component:       50 pts ( 50 - fraudScore*0.5, clamped )
 *   affiliate component:   30 pts ( FTD-rate 20 + base 10 - reject-rate penalty 10; cold-start = 30 )
 *   broker-GEO component:  20 pts ( acceptance-rate * 20; cold-start = 10 )
 */
export function computeQualityScore(input: QualityInput): QualityResult {
  const fraudComponent = Math.max(0, Math.min(50, 50 - input.fraudScore * 0.5));

  let affiliateComponent = 30;
  if (input.affiliate.leadCount >= 20) {
    const ftdRate = input.affiliate.ftdCount / input.affiliate.leadCount;
    const rejRate = input.affiliate.rejectedCount / input.affiliate.leadCount;
    affiliateComponent = Math.max(0, Math.min(20, ftdRate * 100) + 10 - Math.min(10, rejRate * 50));
  } else if (input.affiliate.leadCount > 0) {
    const partial = input.affiliate.leadCount / 20;
    const ftdRate = input.affiliate.ftdCount / Math.max(1, input.affiliate.leadCount);
    affiliateComponent = 30 * (1 - partial) + Math.min(30, ftdRate * 150) * partial;
  }

  let brokerGeoComponent = 10;
  if (input.brokerGeo && input.brokerGeo.pushedCount >= 50) {
    brokerGeoComponent = Math.max(0, Math.min(20, input.brokerGeo.acceptanceRate * 20));
  }

  const raw = fraudComponent + affiliateComponent + brokerGeoComponent;
  return {
    score: Math.round(Math.max(0, Math.min(100, raw))),
    components: {
      fraudComponent: Math.round(fraudComponent),
      affiliateComponent: Math.round(affiliateComponent),
      brokerGeoComponent: Math.round(brokerGeoComponent),
    },
  };
}

const D30 = 30 * 86_400_000;

export async function loadAffiliateHistory(affiliateId: string): Promise<AffiliateHistory> {
  const since = new Date(Date.now() - D30);
  const rows = await prisma.$queryRaw<
    Array<{
      total: bigint;
      ftd: bigint;
      rejected: bigint;
      avg_fraud: number | null;
    }>
  >`
    SELECT COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE state = 'FTD')::bigint AS ftd,
           COUNT(*) FILTER (WHERE state = 'REJECTED')::bigint AS rejected,
           AVG("fraudScore")::float AS avg_fraud
    FROM "Lead" WHERE "affiliateId" = ${affiliateId} AND "createdAt" >= ${since}
  `;
  const r = rows[0] ?? { total: 0n, ftd: 0n, rejected: 0n, avg_fraud: null };
  return {
    leadCount: Number(r.total),
    ftdCount: Number(r.ftd),
    rejectedCount: Number(r.rejected),
    avgFraudScore: r.avg_fraud,
  };
}

// --- v1.5 S4: Q-Leads trend extension -----------------------------------

export type AffiliateTrend = "up" | "flat" | "down";

export interface AffiliateTrendInput {
  /** avg quality score for leads in last 7 days (null = no history) */
  avg7d: number | null;
  /** avg quality score for leads in 7d..14d window (null = no prior) */
  avgPrev7d: number | null;
  /** avg7d − avgPrev7d (0 when either is null) */
  delta: number;
}

export interface QualityResultWithTrend extends QualityResult {
  trend: AffiliateTrend;
  trendDelta: number;
}

/**
 * Classify the per-affiliate trend.
 *   down: avg declined > 10 pts over last 7 days
 *   up:   avg stable AND >= 80 for last 7 days
 *   flat: otherwise (including insufficient history)
 */
export function classifyAffiliateTrend(input: AffiliateTrendInput): AffiliateTrend {
  if (input.avg7d == null) return "flat";
  if (input.delta < -10) return "down";
  if (input.avg7d >= 80 && Math.abs(input.delta) <= 5) return "up";
  return "flat";
}

/** Apply ±N pts trend adjustment and clamp to 0..100. */
export function applyAffiliateTrend(score: number, trend: AffiliateTrend): number {
  const adj = trend === "down" ? -5 : trend === "up" ? 3 : 0;
  return Math.max(0, Math.min(100, score + adj));
}

export interface QualityInputWithTrend extends QualityInput {
  trend: AffiliateTrendInput;
}

/**
 * Wrap `computeQualityScore` with the v1.5 per-affiliate trend adjustment.
 * Backward-compatible: when trend has no history, returns identical score +
 * `trend: "flat"` + `trendDelta: 0`.
 */
export function computeQualityScoreWithTrend(input: QualityInputWithTrend): QualityResultWithTrend {
  const base = computeQualityScore(input);
  const trend = classifyAffiliateTrend(input.trend);
  const adjusted = applyAffiliateTrend(base.score, trend);
  return {
    score: adjusted,
    components: base.components,
    trend,
    trendDelta: input.trend.delta,
  };
}

/**
 * Load the 7-day and prior-7-day average Q-scores for an affiliate.
 * Result drives `classifyAffiliateTrend` — both averages are means over
 * non-null `Lead.qualityScore` values in their window.
 */
export async function loadAffiliate7dTrend(affiliateId: string): Promise<AffiliateTrendInput> {
  const now = Date.now();
  const D7 = 7 * 86_400_000;
  const last7Start = new Date(now - D7);
  const last7End = new Date(now);
  const prev7Start = new Date(now - 2 * D7);
  const prev7End = last7Start;
  const rows = await prisma.$queryRaw<Array<{ avg_last: number | null; avg_prev: number | null }>>`
    SELECT
      AVG("qualityScore") FILTER (
        WHERE "createdAt" >= ${last7Start} AND "createdAt" < ${last7End}
      )::float AS avg_last,
      AVG("qualityScore") FILTER (
        WHERE "createdAt" >= ${prev7Start} AND "createdAt" < ${prev7End}
      )::float AS avg_prev
    FROM "Lead"
    WHERE "affiliateId" = ${affiliateId}
      AND "qualityScore" IS NOT NULL
      AND "createdAt" >= ${prev7Start}
  `;
  const r = rows[0] ?? { avg_last: null, avg_prev: null };
  const avg7d = r.avg_last;
  const avgPrev7d = r.avg_prev;
  const delta = avg7d != null && avgPrev7d != null ? avg7d - avgPrev7d : 0;
  return { avg7d, avgPrev7d, delta };
}

export async function loadBrokerGeoStats(
  brokerId: string | null,
  geo: string,
): Promise<BrokerGeoStats | null> {
  if (!brokerId) return null;
  const since = new Date(Date.now() - D30);
  const rows = await prisma.$queryRaw<Array<{ pushed: bigint; accepted: bigint }>>`
    SELECT COUNT(*) FILTER (WHERE state IN ('PUSHED','ACCEPTED','FTD'))::bigint AS pushed,
           COUNT(*) FILTER (WHERE state IN ('ACCEPTED','FTD'))::bigint AS accepted
    FROM "Lead" WHERE "brokerId" = ${brokerId} AND geo = ${geo} AND "createdAt" >= ${since}
  `;
  const r = rows[0] ?? { pushed: 0n, accepted: 0n };
  const pushedCount = Number(r.pushed);
  const acceptedCount = Number(r.accepted);
  return {
    pushedCount,
    acceptedCount,
    acceptanceRate: pushedCount === 0 ? 0 : acceptedCount / pushedCount,
  };
}
