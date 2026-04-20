import { refreshHourlyRollups } from "@/server/analytics/rollup";
import { logger } from "@/server/observability";

export interface AnalyticsRollPayload {
  from?: string;
  to?: string;
}

/**
 * pg-boss handler for `analytics-roll-hourly`.
 * Defaults to refreshing the last 2 hours (current + previous hour) so in-flight
 * leads propagate quickly. Operators can override via ISO `from`/`to` for backfills.
 */
export async function handleAnalyticsRollHourly(payload: AnalyticsRollPayload = {}): Promise<void> {
  const to = payload.to ? new Date(payload.to) : new Date();
  const from = payload.from ? new Date(payload.from) : new Date(to.getTime() - 2 * 60 * 60 * 1000);
  const t0 = Date.now();
  await refreshHourlyRollups({ from, to });
  logger.info({
    event: "analytics_roll_hourly_done",
    from: from.toISOString(),
    to: to.toISOString(),
    duration_ms: Date.now() - t0,
  });
}
