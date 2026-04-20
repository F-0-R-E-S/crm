import { prisma } from "@/server/db";

export interface StatsFilters {
  affiliateIds?: string[];
  brokerIds?: string[];
}

export interface TodayStats {
  intake: number;
  pushed: number;
  accepted: number;
  declined: number;
  ftd: number;
  rejected: number;
}

function startOfDayUtc(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function todayStats(
  filters: StatsFilters = {},
  now: Date = new Date(),
): Promise<TodayStats> {
  const gte = startOfDayUtc(now);
  const where: {
    createdAt: { gte: Date };
    affiliateId?: { in: string[] };
    brokerId?: { in: string[] };
  } = { createdAt: { gte } };
  if (filters.affiliateIds?.length) where.affiliateId = { in: filters.affiliateIds };
  if (filters.brokerIds?.length) where.brokerId = { in: filters.brokerIds };

  const rows = await prisma.lead.groupBy({
    by: ["state"],
    where,
    _count: { _all: true },
  });
  const byState: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byState[r.state] = r._count._all;
    total += r._count._all;
  }
  return {
    intake: total,
    pushed: byState.PUSHED ?? 0,
    accepted: byState.ACCEPTED ?? 0,
    declined: byState.DECLINED ?? 0,
    ftd: byState.FTD ?? 0,
    rejected: (byState.REJECTED ?? 0) + (byState.REJECTED_FRAUD ?? 0),
  };
}
