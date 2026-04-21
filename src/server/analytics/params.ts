import { createHash } from "node:crypto";
import { z } from "zod";

export const MetricKey = z.enum(["leads", "ftds", "accepted", "revenue", "acceptanceRate"]);
export type MetricKey = z.infer<typeof MetricKey>;

export const GroupBy = z.enum(["affiliate", "broker", "geo", "hour", "day", "week"]);
export type GroupBy = z.infer<typeof GroupBy>;

export const AnalyticsFilters = z.object({
  affiliateIds: z.array(z.string()).default([]),
  brokerIds: z.array(z.string()).default([]),
  geos: z.array(z.string()).default([]),
  canonicalStatuses: z.array(z.string()).optional(),
});
/**
 * Post-parse type. `canonicalStatuses` is optional for backward compatibility
 * — consumers treat `undefined` as empty array.
 */
export type AnalyticsFilters = z.infer<typeof AnalyticsFilters>;

export const CompareTo = z.enum(["previous_period", "year_ago", "custom"]).nullable().default(null);
export type CompareTo = z.infer<typeof CompareTo>;

export const AnalyticsParams = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  groupBy: GroupBy.default("day"),
  filters: AnalyticsFilters.default({ affiliateIds: [], brokerIds: [], geos: [] }),
  compareTo: CompareTo,
  compareFrom: z.coerce.date().optional(),
  compareToEnd: z.coerce.date().optional(),
  metric: MetricKey.default("leads"),
});
export type AnalyticsParams = z.infer<typeof AnalyticsParams>;

/** Deterministic JSON serialization with sorted keys for cache-key stability. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    if (v instanceof Date) return v.toISOString();
    return v;
  });
}

export function hashParams(obj: unknown): string {
  return createHash("sha256").update(stableStringify(obj)).digest("hex");
}

/**
 * Resolve the compare-to window for a given primary window.
 * Returns `null` if no compare requested.
 * Throws if `custom` is requested without explicit bounds.
 */
export function computeComparePeriod(
  from: Date,
  to: Date,
  compareTo: CompareTo,
  explicitFrom?: Date,
  explicitEnd?: Date,
): { from: Date; to: Date } | null {
  if (compareTo === null) return null;
  if (compareTo === "custom") {
    if (!explicitFrom || !explicitEnd) {
      throw new Error("custom compare requires compareFrom and compareToEnd");
    }
    return { from: explicitFrom, to: explicitEnd };
  }
  if (compareTo === "previous_period") {
    const span = to.getTime() - from.getTime();
    return {
      from: new Date(from.getTime() - span),
      to: new Date(to.getTime() - span),
    };
  }
  // year_ago
  const yFrom = new Date(from);
  yFrom.setUTCFullYear(yFrom.getUTCFullYear() - 1);
  const yTo = new Date(to);
  yTo.setUTCFullYear(yTo.getUTCFullYear() - 1);
  return { from: yFrom, to: yTo };
}
