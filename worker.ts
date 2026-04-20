import "dotenv/config";
import {
  type AnalyticsRollPayload,
  handleAnalyticsRollDaily,
} from "./src/server/jobs/analytics-roll-daily";
import { handleAnalyticsRollHourly } from "./src/server/jobs/analytics-roll-hourly";
import { cleanupExpiredIdempotency } from "./src/server/jobs/cleanup-idempotency";
import {
  type NotifyAffiliatePayload,
  handleNotifyAffiliate,
} from "./src/server/jobs/notify-affiliate";
import { type PushLeadPayload, handlePushLead } from "./src/server/jobs/push-lead";
import { type ProxyHealthPayload, handleProxyHealth } from "./src/server/jobs/proxy-health";
import {
  type AutologinAttemptPayload,
  handleAutologinAttempt,
} from "./src/server/jobs/autologin-attempt";
import { JOB_NAMES, startBossOnce } from "./src/server/jobs/queue";
import {
  type ResolvePendingHoldPayload,
  handleResolvePendingHold,
} from "./src/server/jobs/resolve-pending-hold";
import { detectAnomalies } from "./src/server/jobs/anomaly-detect";
import {
  type TelegramSendPayload,
  handleTelegramSend,
} from "./src/server/jobs/telegram-send";
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

  await boss.work<ResolvePendingHoldPayload>(JOB_NAMES.resolvePendingHold, async ([job]) => {
    await handleResolvePendingHold(job.data);
  });

  await boss.work<ProxyHealthPayload>(JOB_NAMES.proxyHealth, async ([job]) => {
    await handleProxyHealth(job.data);
  });

  await boss.work<AutologinAttemptPayload>(JOB_NAMES.autologinAttempt, async ([job]) => {
    await handleAutologinAttempt(job.data);
  });

  await boss.work<AnalyticsRollPayload>(JOB_NAMES.analyticsRollDaily, async ([job]) => {
    await handleAnalyticsRollDaily(job.data);
  });

  await boss.work<AnalyticsRollPayload>(JOB_NAMES.analyticsRollHourly, async ([job]) => {
    await handleAnalyticsRollHourly(job.data);
  });

  await boss.work<TelegramSendPayload>(JOB_NAMES.telegramSend, async ([job]) => {
    await handleTelegramSend(job.data);
  });

  await boss.work(JOB_NAMES.anomalyDetect, async () => {
    await detectAnomalies();
  });

  // Schedules — pg-boss uses cron syntax
  await boss.schedule(JOB_NAMES.analyticsRollDaily, "*/15 * * * *", {});
  await boss.schedule(JOB_NAMES.analyticsRollHourly, "*/5 * * * *", {});
  await boss.schedule(JOB_NAMES.anomalyDetect, "*/15 * * * *", {});

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
