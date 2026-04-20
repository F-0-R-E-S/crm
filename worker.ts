import "dotenv/config";
import { cleanupExpiredIdempotency } from "./src/server/jobs/cleanup-idempotency";
import {
  type NotifyAffiliatePayload,
  handleNotifyAffiliate,
} from "./src/server/jobs/notify-affiliate";
import { type PushLeadPayload, handlePushLead } from "./src/server/jobs/push-lead";
import { JOB_NAMES, startBossOnce } from "./src/server/jobs/queue";
import {
  type ResolvePendingHoldPayload,
  handleResolvePendingHold,
} from "./src/server/jobs/resolve-pending-hold";
import { type VoipCheckPayload, handleVoipCheck } from "./src/server/jobs/voip-check";
import { logger, runWithTrace } from "./src/server/observability";

async function main() {
  const boss = await startBossOnce();
  logger.info("worker starting");

  await boss.work<PushLeadPayload>(
    JOB_NAMES.pushLead,
    { batchSize: 20, pollingIntervalSeconds: 1 },
    async (jobs) => {
      await Promise.all(
        jobs.map((job) => runWithTrace(job.data.traceId, () => handlePushLead(job.data))),
      );
    },
  );

  await boss.work<NotifyAffiliatePayload>(
    JOB_NAMES.notifyAffiliate,
    { batchSize: 20, pollingIntervalSeconds: 1 },
    async (jobs) => {
      await Promise.all(jobs.map((job) => handleNotifyAffiliate(job.data)));
    },
  );

  await boss.work<VoipCheckPayload>(JOB_NAMES.voipCheck, async ([job]) => {
    await handleVoipCheck(job.data);
  });

  await boss.work<ResolvePendingHoldPayload>(
    JOB_NAMES.resolvePendingHold,
    async ([job]) => {
      await handleResolvePendingHold(job.data);
    },
  );

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
