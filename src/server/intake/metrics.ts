import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";

export type Interval = "1m" | "5m" | "1h";
export type GroupBy = "affiliate" | "geo" | "status" | null;

export interface MetricsInput {
  from: Date;
  to: Date;
  interval: Interval;
  groupBy: GroupBy;
  affiliateScope?: string[] | null;
}

export interface MetricsBucket {
  bucket_start: string;
  group: string | null;
  accepted: number;
  rejected: number;
  duplicates: number;
  p95_latency_ms: number | null;
}

const INTERVAL_SEC: Record<Interval, number> = { "1m": 60, "5m": 300, "1h": 3600 };

export async function aggregateMetrics(input: MetricsInput): Promise<MetricsBucket[]> {
  if (input.to <= input.from) throw new Error("invalid_date_range");

  const bucket = INTERVAL_SEC[input.interval];
  const groupExpr =
    input.groupBy === "affiliate"
      ? `"affiliateId"`
      : input.groupBy === "geo"
        ? `"geo"`
        : input.groupBy === "status"
          ? `"state"`
          : `NULL`;

  const scopeWhere =
    input.affiliateScope && input.affiliateScope.length
      ? Prisma.sql`AND "affiliateId" = ANY(${input.affiliateScope})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      bucket_start: Date;
      grp: string | null;
      accepted: bigint;
      rejected: bigint;
      duplicates: bigint;
    }>
  >(Prisma.sql`
    SELECT
      to_timestamp(floor(extract(epoch from "createdAt") / ${bucket}) * ${bucket}) AS bucket_start,
      ${Prisma.raw(groupExpr)}::text AS grp,
      SUM(CASE WHEN "state" = 'NEW' OR "state" = 'PUSHED' OR "state" = 'ACCEPTED' OR "state" = 'FTD' THEN 1 ELSE 0 END)::bigint AS accepted,
      SUM(CASE WHEN "state" = 'REJECTED' THEN 1 ELSE 0 END)::bigint AS rejected,
      SUM(CASE WHEN "state" = 'REJECTED' AND "rejectReason" = 'duplicate' THEN 1 ELSE 0 END)::bigint AS duplicates
    FROM "Lead"
    WHERE "createdAt" >= ${input.from} AND "createdAt" < ${input.to}
    ${scopeWhere}
    GROUP BY bucket_start, grp
    ORDER BY bucket_start ASC
  `);

  return rows.map((r) => ({
    bucket_start: r.bucket_start.toISOString(),
    group: r.grp,
    accepted: Number(r.accepted),
    rejected: Number(r.rejected),
    duplicates: Number(r.duplicates),
    p95_latency_ms: null,
  }));
}
