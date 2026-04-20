import { PgBoss } from "pg-boss";

const globalForBoss = globalThis as unknown as { boss?: PgBoss };

export function getBoss(): PgBoss {
  if (globalForBoss.boss) return globalForBoss.boss;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL missing");
  const boss = new PgBoss({ connectionString, schema: "pgboss" });
  globalForBoss.boss = boss;
  return boss;
}

export const JOB_NAMES = {
  pushLead: "push-lead",
  notifyAffiliate: "notify-affiliate",
  voipCheck: "voip-check",
  cleanupIdempotency: "cleanup-idempotency",
  bulkIntake: "bulk-intake",
  intakeWebhookDelivery: "intake-webhook-delivery",
  sandboxPurge: "sandbox-purge",
  batchSimulate: "batch-simulate",
  flowCapRefresh: "flow-cap-refresh",
  brokerHealthCheck: "broker-health-check",
  brokerStatusPoll: "broker-status-poll",
  brokerErrorAggregator: "broker-error-aggregator",
  resolvePendingHold: "resolve-pending-hold",
  autologinAttempt: "autologin-attempt",
  proxyHealth: "proxy-health",
} as const;

const globalForBossStarted = globalThis as unknown as { bossStarted?: boolean };

export async function startBossOnce(): Promise<PgBoss> {
  const boss = getBoss();
  if (!globalForBossStarted.bossStarted) {
    await boss.start();
    for (const name of Object.values(JOB_NAMES)) {
      await boss.createQueue(name);
    }
    globalForBossStarted.bossStarted = true;
  }
  return boss;
}
