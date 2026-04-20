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
