import {
  type AnalyticsFilters,
  type AnalyticsParams,
  type GroupBy,
  type MetricKey,
  computeComparePeriod,
} from "@/server/analytics/params";
import { prisma } from "@/server/db";

export interface SeriesPoint {
  bucket: string;
  value: number;
}

export interface MetricSeriesResult {
  series: SeriesPoint[];
  total: number;
  compare: { series: SeriesPoint[]; total: number } | null;
  deltaPct: number | null;
}

function metricExpr(m: MetricKey): string {
  switch (m) {
    case "leads":
      return `SUM("totalReceived")::int`;
    case "ftds":
      return `SUM("totalFtd")::int`;
    case "accepted":
      return `SUM("totalAccepted")::int`;
    case "revenue":
      return `COALESCE(SUM("sumRevenue"),0)::float`;
    case "acceptanceRate":
      return `CASE WHEN SUM("totalPushed")=0 THEN 0 ELSE SUM("totalAccepted")::float / SUM("totalPushed")::float END`;
  }
}

function tableFor(groupBy: GroupBy): { table: string; bucketCol: string } {
  if (groupBy === "hour") return { table: "LeadHourlyRoll", bucketCol: "hour" };
  return { table: "LeadDailyRoll", bucketCol: "date" };
}

function truncFor(groupBy: GroupBy): string {
  if (groupBy === "week") return "week";
  if (groupBy === "hour") return "hour";
  return "day";
}

function groupExprFor(groupBy: GroupBy, bucketCol: string, trunc: string): string {
  if (groupBy === "affiliate") return `"affiliateId"`;
  if (groupBy === "broker") return `"brokerId"`;
  if (groupBy === "geo") return "geo";
  return `date_trunc('${trunc}', "${bucketCol}")`;
}

function coerceBucket(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * Build the WHERE clause with positional params.
 * Returns the SQL fragment and the params array.
 */
function buildWhere(
  bucketCol: string,
  from: Date,
  to: Date,
  filters: AnalyticsFilters,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [from, to];
  const parts: string[] = [`"${bucketCol}" >= $1 AND "${bucketCol}" < $2`];
  if (filters.affiliateIds.length > 0) {
    params.push(filters.affiliateIds);
    parts.push(`"affiliateId" = ANY($${params.length}::text[])`);
  }
  if (filters.brokerIds.length > 0) {
    params.push(filters.brokerIds);
    parts.push(`"brokerId" = ANY($${params.length}::text[])`);
  }
  if (filters.geos.length > 0) {
    params.push(filters.geos);
    parts.push(`geo = ANY($${params.length}::text[])`);
  }
  return { clause: parts.join(" AND "), params };
}

async function runMetricQuery(
  from: Date,
  to: Date,
  groupBy: GroupBy,
  metric: MetricKey,
  filters: AnalyticsFilters,
): Promise<{ series: SeriesPoint[]; total: number }> {
  const { table, bucketCol } = tableFor(groupBy);
  const trunc = truncFor(groupBy);
  const groupExpr = groupExprFor(groupBy, bucketCol, trunc);
  const valueExpr = metricExpr(metric);
  const { clause, params } = buildWhere(bucketCol, from, to, filters);
  // Whitelisted groupBy/metric, so template interpolation is safe; filter arrays go through params.
  const sql = `SELECT ${groupExpr} AS bucket, ${valueExpr} AS value FROM "${table}" WHERE ${clause} GROUP BY 1 ORDER BY 1 ASC`;
  const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as Array<{
    bucket: unknown;
    value: unknown;
  }>;
  const series: SeriesPoint[] = rows.map((r) => ({
    bucket: coerceBucket(r.bucket),
    value: Number(r.value) || 0,
  }));
  const total = series.reduce((s, p) => s + p.value, 0);
  return { series, total };
}

export async function metricSeries(p: AnalyticsParams): Promise<MetricSeriesResult> {
  const current = await runMetricQuery(p.from, p.to, p.groupBy, p.metric, p.filters);
  const comparePeriod = computeComparePeriod(
    p.from,
    p.to,
    p.compareTo,
    p.compareFrom,
    p.compareToEnd,
  );
  let compare: { series: SeriesPoint[]; total: number } | null = null;
  let deltaPct: number | null = null;
  if (comparePeriod) {
    compare = await runMetricQuery(
      comparePeriod.from,
      comparePeriod.to,
      p.groupBy,
      p.metric,
      p.filters,
    );
    deltaPct = compare.total === 0 ? null : ((current.total - compare.total) / compare.total) * 100;
  }
  return { ...current, compare, deltaPct };
}

// --- Breakdowns ---

export interface ConversionBreakdownResult {
  stages: {
    received: number;
    validated: number;
    rejected: number;
    pushed: number;
    accepted: number;
    declined: number;
    ftd: number;
  };
  rates: {
    validationRate: number;
    acceptanceRate: number;
    ftdRate: number;
  };
  compare: ConversionBreakdownResult | null;
}

async function runConvQuery(
  from: Date,
  to: Date,
  filters: AnalyticsFilters,
): Promise<ConversionBreakdownResult["stages"]> {
  const { clause, params } = buildWhere("date", from, to, filters);
  const sql = `SELECT
		COALESCE(SUM("totalReceived"),0)::int AS received,
		COALESCE(SUM("totalValidated"),0)::int AS validated,
		COALESCE(SUM("totalRejected"),0)::int AS rejected,
		COALESCE(SUM("totalPushed"),0)::int AS pushed,
		COALESCE(SUM("totalAccepted"),0)::int AS accepted,
		COALESCE(SUM("totalDeclined"),0)::int AS declined,
		COALESCE(SUM("totalFtd"),0)::int AS ftd
		FROM "LeadDailyRoll" WHERE ${clause}`;
  const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as Array<{
    received: number;
    validated: number;
    rejected: number;
    pushed: number;
    accepted: number;
    declined: number;
    ftd: number;
  }>;
  const r = rows[0] ?? {
    received: 0,
    validated: 0,
    rejected: 0,
    pushed: 0,
    accepted: 0,
    declined: 0,
    ftd: 0,
  };
  return {
    received: Number(r.received) || 0,
    validated: Number(r.validated) || 0,
    rejected: Number(r.rejected) || 0,
    pushed: Number(r.pushed) || 0,
    accepted: Number(r.accepted) || 0,
    declined: Number(r.declined) || 0,
    ftd: Number(r.ftd) || 0,
  };
}

function ratesFrom(stages: ConversionBreakdownResult["stages"]) {
  return {
    validationRate: stages.received === 0 ? 0 : stages.validated / stages.received,
    acceptanceRate: stages.pushed === 0 ? 0 : stages.accepted / stages.pushed,
    ftdRate: stages.accepted === 0 ? 0 : stages.ftd / stages.accepted,
  };
}

export async function conversionBreakdown(p: AnalyticsParams): Promise<ConversionBreakdownResult> {
  const stages = await runConvQuery(p.from, p.to, p.filters);
  const rates = ratesFrom(stages);
  const comparePeriod = computeComparePeriod(
    p.from,
    p.to,
    p.compareTo,
    p.compareFrom,
    p.compareToEnd,
  );
  let compare: ConversionBreakdownResult | null = null;
  if (comparePeriod) {
    const cStages = await runConvQuery(comparePeriod.from, comparePeriod.to, p.filters);
    compare = {
      stages: cStages,
      rates: ratesFrom(cStages),
      compare: null,
    };
  }
  return { stages, rates, compare };
}

export interface RejectBreakdownResult {
  byReason: Array<{ reason: string; count: number }>;
  total: number;
}

/**
 * Exception to the "never read Lead directly" rule: `rejectReason` is not yet
 * materialized into the rollup tables. The query is bounded by the analytics
 * window plus `state = REJECTED`, so it stays cheap. Move `rejectReason` into
 * the rollup in a follow-up once we have enough data to enumerate reasons.
 */
export async function rejectBreakdown(p: AnalyticsParams): Promise<RejectBreakdownResult> {
  const where: Record<string, unknown> = {
    state: "REJECTED",
    receivedAt: { gte: p.from, lt: p.to },
  };
  if (p.filters.affiliateIds.length > 0) where.affiliateId = { in: p.filters.affiliateIds };
  if (p.filters.brokerIds.length > 0) where.brokerId = { in: p.filters.brokerIds };
  if (p.filters.geos.length > 0) where.geo = { in: p.filters.geos };
  const rows = await prisma.lead.groupBy({
    by: ["rejectReason"],
    where,
    _count: { _all: true },
  });
  const byReason = rows
    .map((r) => ({ reason: r.rejectReason ?? "unknown", count: r._count._all }))
    .sort((a, b) => b.count - a.count);
  const total = byReason.reduce((s, r) => s + r.count, 0);
  return { byReason, total };
}

export interface CanonicalStatusBreakdownRow {
  canonicalStatus: string;
  count: number;
}

export interface CanonicalStatusBreakdownResult {
  rows: CanonicalStatusBreakdownRow[];
  total: number;
}

/**
 * Per-canonical-status lead counts in the window.
 *
 * Strategy (v1.5): prefer `LeadDailyRoll` which now groups by `canonicalStatus`;
 * fall back to `Lead` direct-scan for the current UTC day where the rollup may
 * not yet have run. Result is the union (sum by canonicalStatus) of the two.
 *
 * `__none__` sentinel in the rollup maps back to `unmapped` for display parity
 * with the pre-v1.5 direct-scan behaviour.
 */
export async function canonicalStatusBreakdown(
  p: AnalyticsParams,
): Promise<CanonicalStatusBreakdownResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Rollup covers the window up to (but not including) today's UTC midnight.
  const rollupTo = p.to > today ? today : p.to;
  const rollupHasWindow = rollupTo > p.from;

  const totals = new Map<string, number>();

  if (rollupHasWindow) {
    const { clause, params } = buildWhere("date", p.from, rollupTo, p.filters);
    let sql = `SELECT "canonicalStatus" AS cs, COALESCE(SUM("totalReceived"),0)::int AS c
      FROM "LeadDailyRoll" WHERE ${clause}`;
    const filterParams = [...params];
    const canonicalStatuses = p.filters.canonicalStatuses ?? [];
    if (canonicalStatuses.length > 0) {
      filterParams.push(canonicalStatuses);
      sql += ` AND "canonicalStatus" = ANY($${filterParams.length}::text[])`;
    }
    sql += " GROUP BY 1";
    const rows = (await prisma.$queryRawUnsafe(sql, ...filterParams)) as Array<{
      cs: string;
      c: number;
    }>;
    for (const r of rows) {
      const key = r.cs === "__none__" ? "unmapped" : r.cs;
      totals.set(key, (totals.get(key) ?? 0) + (Number(r.c) || 0));
    }
  }

  // Same-day fallback: scan Lead for [max(p.from, today), p.to) where the
  // rollup may still be pending.
  const tailFrom = p.from > today ? p.from : today;
  if (p.to > tailFrom) {
    const where: Record<string, unknown> = {
      createdAt: { gte: tailFrom, lt: p.to },
    };
    if (p.filters.affiliateIds.length > 0) where.affiliateId = { in: p.filters.affiliateIds };
    if (p.filters.brokerIds.length > 0) where.brokerId = { in: p.filters.brokerIds };
    if (p.filters.geos.length > 0) where.geo = { in: p.filters.geos };
    const canonicalStatuses = p.filters.canonicalStatuses ?? [];
    if (canonicalStatuses.length > 0) {
      where.canonicalStatus = { in: canonicalStatuses };
    }
    const rows = await prisma.lead.groupBy({
      by: ["canonicalStatus"],
      where,
      _count: { _all: true },
    });
    for (const r of rows) {
      const key = r.canonicalStatus ?? "unmapped";
      totals.set(key, (totals.get(key) ?? 0) + r._count._all);
    }
  }

  const out = Array.from(totals.entries())
    .map(([canonicalStatus, count]) => ({ canonicalStatus, count }))
    .sort((a, b) => b.count - a.count);
  const total = out.reduce((s, r) => s + r.count, 0);
  return { rows: out, total };
}

export interface RevenueBreakdownRow {
  bucket: string;
  revenue: number;
  ftds: number;
  pushed: number;
}

export interface RevenueBreakdownResult {
  rows: RevenueBreakdownRow[];
  total: { revenue: number; ftds: number; pushed: number };
}

export async function revenueBreakdown(p: AnalyticsParams): Promise<RevenueBreakdownResult> {
  const groupExpr = groupExprFor(p.groupBy, "date", truncFor(p.groupBy));
  const { clause, params } = buildWhere("date", p.from, p.to, p.filters);
  const sql = `SELECT ${groupExpr} AS bucket,
		COALESCE(SUM("sumRevenue"),0)::float AS revenue,
		COALESCE(SUM("totalFtd"),0)::int AS ftds,
		COALESCE(SUM("totalPushed"),0)::int AS pushed
		FROM "LeadDailyRoll"
		WHERE ${clause}
		GROUP BY 1
		ORDER BY revenue DESC`;
  const raw = (await prisma.$queryRawUnsafe(sql, ...params)) as Array<{
    bucket: unknown;
    revenue: unknown;
    ftds: unknown;
    pushed: unknown;
  }>;
  const rows: RevenueBreakdownRow[] = raw.map((r) => ({
    bucket: coerceBucket(r.bucket),
    revenue: Number(r.revenue) || 0,
    ftds: Number(r.ftds) || 0,
    pushed: Number(r.pushed) || 0,
  }));
  const total = rows.reduce(
    (s, r) => ({
      revenue: s.revenue + r.revenue,
      ftds: s.ftds + r.ftds,
      pushed: s.pushed + r.pushed,
    }),
    { revenue: 0, ftds: 0, pushed: 0 },
  );
  return { rows, total };
}
