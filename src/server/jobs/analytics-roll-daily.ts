import { refreshDailyRollups } from "@/server/analytics/rollup";
import { logger } from "@/server/observability";

export interface AnalyticsRollPayload {
	from?: string;
	to?: string;
}

/**
 * pg-boss handler for `analytics-roll-daily`.
 * Defaults to refreshing the last 24 hours; operators can override via `from`/`to`
 * (ISO strings) to backfill a historical window.
 */
export async function handleAnalyticsRollDaily(payload: AnalyticsRollPayload = {}): Promise<void> {
	const to = payload.to ? new Date(payload.to) : new Date();
	const from = payload.from ? new Date(payload.from) : new Date(to.getTime() - 24 * 60 * 60 * 1000);
	const t0 = Date.now();
	await refreshDailyRollups({ from, to });
	logger.info({
		event: "analytics_roll_daily_done",
		from: from.toISOString(),
		to: to.toISOString(),
		duration_ms: Date.now() - t0,
	});
}
