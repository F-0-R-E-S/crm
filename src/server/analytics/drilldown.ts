import type { AnalyticsFilters, GroupBy } from "@/server/analytics/params";
import type { Prisma } from "@prisma/client";

/**
 * Given a "bucket" label produced by the analytics query (a date_trunc string
 * or an id like affiliateId / brokerId / geo), derive the [from, to) window
 * and additional where-clauses for a Lead drill-down.
 *
 * Date-trunc buckets come back as ISO timestamps from Postgres `date_trunc`.
 * `hour`, `day`, `week` buckets yield a range of 1 hour / 1 day / 7 days.
 * `affiliate` / `broker` / `geo` buckets translate to an additional equality
 * filter and keep the parent [from, to) window.
 */
export function bucketToRange(
  bucket: string,
  groupBy: GroupBy,
  parentFrom: Date,
  parentTo: Date,
): { from: Date; to: Date; extra: Partial<Record<"affiliateId" | "brokerId" | "geo", string>> } {
  if (groupBy === "affiliate")
    return { from: parentFrom, to: parentTo, extra: { affiliateId: bucket } };
  if (groupBy === "broker") return { from: parentFrom, to: parentTo, extra: { brokerId: bucket } };
  if (groupBy === "geo") return { from: parentFrom, to: parentTo, extra: { geo: bucket } };
  const start = new Date(bucket);
  if (Number.isNaN(start.getTime())) {
    return { from: parentFrom, to: parentTo, extra: {} };
  }
  const spanMs =
    groupBy === "hour" ? 3600_000 : groupBy === "week" ? 7 * 86_400_000 : 86_400_000; /* day */
  const end = new Date(start.getTime() + spanMs);
  return { from: start, to: end, extra: {} };
}

export type DrillDownKind = "metric" | "conversion" | "reject" | "revenue" | "canonical-status";

export function buildLeadWhere(
  kind: DrillDownKind,
  opts: {
    from: Date;
    to: Date;
    filters: AnalyticsFilters;
    metric?: "leads" | "ftds" | "accepted" | "revenue" | "acceptanceRate";
    stage?: "received" | "validated" | "pushed" | "accepted" | "ftd" | "rejected";
    reason?: string;
    canonicalStatus?: string;
    affiliateId?: string;
    brokerId?: string;
    geo?: string;
  },
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    createdAt: { gte: opts.from, lt: opts.to },
  };
  if (opts.filters.affiliateIds.length > 0) where.affiliateId = { in: opts.filters.affiliateIds };
  if (opts.filters.brokerIds.length > 0) where.brokerId = { in: opts.filters.brokerIds };
  if (opts.filters.geos.length > 0) where.geo = { in: opts.filters.geos };
  const canonicalStatuses = opts.filters.canonicalStatuses ?? [];
  if (canonicalStatuses.length > 0) {
    where.canonicalStatus = { in: canonicalStatuses };
  }
  if (opts.affiliateId) where.affiliateId = opts.affiliateId;
  if (opts.brokerId) where.brokerId = opts.brokerId;
  if (opts.geo) where.geo = opts.geo;
  if (kind === "canonical-status" && opts.canonicalStatus) {
    where.canonicalStatus = opts.canonicalStatus;
  } else if (kind === "reject") {
    where.state = "REJECTED";
    if (opts.reason) where.rejectReason = opts.reason;
  } else if (kind === "metric") {
    if (opts.metric === "ftds") where.state = "FTD";
    else if (opts.metric === "accepted") where.state = { in: ["ACCEPTED", "FTD"] };
    // "leads" = no state filter; "revenue"/"acceptanceRate" fall back to all leads in window
  } else if (kind === "conversion") {
    switch (opts.stage) {
      case "received":
        break;
      case "validated":
        where.NOT = { state: { in: ["REJECTED", "REJECTED_FRAUD"] } };
        break;
      case "pushed":
        where.brokerId = { not: null };
        break;
      case "accepted":
        where.state = { in: ["ACCEPTED"] };
        break;
      case "ftd":
        where.state = "FTD";
        break;
      case "rejected":
        where.state = { in: ["REJECTED", "REJECTED_FRAUD"] };
        break;
    }
  } else if (kind === "revenue") {
    where.state = "FTD";
  }
  return where;
}
