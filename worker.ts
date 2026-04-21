import "dotenv/config";
import { evaluateAlerts } from "./src/server/alerts/evaluator";
import {
  type AnalyticsRollPayload,
  handleAnalyticsRollDaily,
} from "./src/server/jobs/analytics-roll-daily";
import { handleAnalyticsRollHourly } from "./src/server/jobs/analytics-roll-hourly";
import { detectAnomalies } from "./src/server/jobs/anomaly-detect";
import { runApplyScheduledChanges } from "./src/server/jobs/apply-scheduled-changes";
import {
  type AutologinAttemptPayload,
  handleAutologinAttempt,
} from "./src/server/jobs/autologin-attempt";
import { cleanupExpiredIdempotency } from "./src/server/jobs/cleanup-idempotency";
import { runCrgCohortSettle } from "./src/server/jobs/crg-cohort-settle";
import { sendDailySummaries } from "./src/server/jobs/daily-summary";
import { checkManualQueueDepth } from "./src/server/jobs/manual-queue-depth-check";
import {
  type NotifyAffiliatePayload,
  handleNotifyAffiliate,
} from "./src/server/jobs/notify-affiliate";
import { type ProxyHealthPayload, handleProxyHealth } from "./src/server/jobs/proxy-health";
import { type PushLeadPayload, handlePushLead } from "./src/server/jobs/push-lead";
import { JOB_NAMES, startBossOnce } from "./src/server/jobs/queue";
import {
  type ResolvePendingHoldPayload,
  handleResolvePendingHold,
} from "./src/server/jobs/resolve-pending-hold";
import { type TelegramSendPayload, handleTelegramSend } from "./src/server/jobs/telegram-send";
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

  await boss.work(JOB_NAMES.dailySummary, async () => {
    await sendDailySummaries();
  });

  await boss.work(JOB_NAMES.manualQueueDepthCheck, async () => {
    await checkManualQueueDepth();
  });

  await boss.work(JOB_NAMES.crgCohortSettle, async () => {
    await runCrgCohortSettle();
  });

  await boss.work(JOB_NAMES.alertsEvaluator, async () => {
    await evaluateAlerts();
  });

  await boss.work(JOB_NAMES.applyScheduledChanges, async () => {
    await runApplyScheduledChanges();
  });

  // Schedules — pg-boss uses cron syntax
  await boss.schedule(JOB_NAMES.analyticsRollDaily, "*/15 * * * *", {});
  await boss.schedule(JOB_NAMES.analyticsRollHourly, "*/5 * * * *", {});
  await boss.schedule(JOB_NAMES.anomalyDetect, "*/15 * * * *", {});
  await boss.schedule(JOB_NAMES.dailySummary, "0 9 * * *", {});
  await boss.schedule(JOB_NAMES.manualQueueDepthCheck, "*/5 * * * *", {});
  await boss.schedule(JOB_NAMES.crgCohortSettle, "0 * * * *", {});
  await boss.schedule(JOB_NAMES.alertsEvaluator, "*/1 * * * *", {});
  await boss.schedule(JOB_NAMES.proxyHealth, "*/10 * * * *", {});
  await boss.schedule(JOB_NAMES.applyScheduledChanges, "*/1 * * * *", {});

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
