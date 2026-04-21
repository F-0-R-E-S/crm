import { logger } from "@/server/observability";
import { applyDueScheduledChanges } from "@/server/scheduled-changes/orchestrator";

/**
 * pg-boss cron handler — runs every 60 seconds.
 * Picks PENDING scheduled changes where applyAt <= now() and applies each
 * via `applyScheduledChange`. Latency logged per batch.
 */
export async function runApplyScheduledChanges(): Promise<void> {
  const start = Date.now();
  const summary = await applyDueScheduledChanges(new Date());
  const took = Date.now() - start;
  if (summary.processed > 0) {
    logger.info(
      {
        event: "apply_scheduled_changes_tick",
        processed: summary.processed,
        applied: summary.applied,
        failed: summary.failed,
        max_latency_ms: summary.maxLatencyMs,
        took_ms: took,
      },
      "apply scheduled changes tick",
    );
  }
}
