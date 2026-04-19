import "dotenv/config";
import { cleanupExpiredIdempotency } from "./src/server/jobs/cleanup-idempotency";
import { type PushLeadPayload, handlePushLead } from "./src/server/jobs/push-lead";
import { JOB_NAMES, startBossOnce } from "./src/server/jobs/queue";
import { logger, runWithTrace } from "./src/server/observability";

async function main() {
  const boss = await startBossOnce();
  logger.info("worker starting");

  await boss.work<PushLeadPayload>(JOB_NAMES.pushLead, async ([job]) => {
    await runWithTrace(job.data.traceId, () => handlePushLead(job.data));
  });

  // Every hour, sweep expired idempotency rows
  setInterval(async () => {
    const n = await cleanupExpiredIdempotency();
    if (n > 0) logger.info({ event: "idempotency_cleanup", deleted: n }, "cleanup");
  }, 3600_000);

  logger.info("worker ready");
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
