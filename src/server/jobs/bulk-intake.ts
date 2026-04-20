import type { Job } from "pg-boss";
import { processBulkItem } from "@/server/intake/bulk";
import { logger } from "@/server/observability";

export interface BulkIntakeJobData {
  affiliateId: string;
  items: unknown[];
  version: string;
  traceId: string;
}

export async function handleBulkIntake(job: Job<BulkIntakeJobData>) {
  const { affiliateId, items, version, traceId } = job.data;
  const results = [];
  for (let i = 0; i < items.length; i++) {
    results.push(await processBulkItem(affiliateId, items[i], i, version, traceId));
  }
  const accepted = results.filter((r) => r.status_code === 202).length;
  logger.info(
    {
      event: "bulk_intake_done",
      job_id: job.id,
      affiliate_id: affiliateId,
      total: items.length,
      accepted,
      trace_id: traceId,
    },
    "bulk job done",
  );
  return { accepted, total: items.length };
}
