import { prisma } from "@/server/db";

export type AlertSeverity = "warning" | "critical";

export interface AlertTrigger {
  severity: AlertSeverity;
  message: string;
  windowStart: Date;
  windowEnd: Date;
  measurement: Record<string, unknown>;
}

export interface Rule {
  key: string;
  severity: AlertSeverity;
  windowSeconds: number;
  evaluate: (now: Date) => Promise<AlertTrigger | null>;
}

const FAILED_STATES = ["REJECTED", "REJECTED_FRAUD", "FAILED"] as const;

export const rules: Rule[] = [
  {
    key: "intake_failure_rate",
    severity: "critical",
    windowSeconds: 300,
    async evaluate(now) {
      const start = new Date(now.getTime() - 300_000);
      const leads = await prisma.lead.findMany({
        where: { createdAt: { gte: start, lte: now } },
        select: { state: true },
      });
      const total = leads.length;
      if (total < 100) return null;
      const failed = leads.filter((l) =>
        (FAILED_STATES as readonly string[]).includes(l.state as string),
      ).length;
      const rate = failed / total;
      if (rate <= 0.01) return null;
      return {
        severity: "critical",
        message: `intake failure rate ${(rate * 100).toFixed(2)}% (${failed}/${total}) exceeds 1%`,
        windowStart: start,
        windowEnd: now,
        measurement: { rate, failed, total, threshold: 0.01 },
      };
    },
  },
  {
    key: "routing_p95",
    severity: "critical",
    windowSeconds: 300,
    async evaluate(now) {
      // We compute p95 from LeadEvent(ROUTING_DECIDED).meta.decidedInMs over 5 min.
      const start = new Date(now.getTime() - 300_000);
      const rows = await prisma.$queryRaw<{ p95: number | null }[]>`
        SELECT percentile_cont(0.95) WITHIN GROUP (
          ORDER BY (("meta"->>'decidedInMs')::float)
        ) AS p95
        FROM "LeadEvent"
        WHERE "kind" = 'ROUTING_DECIDED'
          AND "createdAt" >= ${start}
          AND "createdAt" <= ${now}
          AND ("meta"->>'decidedInMs') IS NOT NULL
      `.catch(() => [{ p95: null as number | null }]);
      const p95 = rows[0]?.p95 ?? null;
      if (p95 == null || p95 <= 1000) return null;
      return {
        severity: "critical",
        message: `routing engine p95 ${p95.toFixed(0)}ms exceeds 1000ms over 5m`,
        windowStart: start,
        windowEnd: now,
        measurement: { p95, threshold: 1000 },
      };
    },
  },
  {
    key: "autologin_sla_breach",
    severity: "warning",
    windowSeconds: 600,
    async evaluate(now) {
      const start = new Date(now.getTime() - 600_000);
      const count = await prisma.autologinAttempt.count({
        where: {
          createdAt: { gte: start, lte: now },
          status: "FAILED",
          durationMs: { gt: 10_000 },
        },
      });
      if (count === 0) return null;
      return {
        severity: "warning",
        message: `${count} autologin SLA breaches in last 10m`,
        windowStart: start,
        windowEnd: now,
        measurement: { count, threshold_ms: 10_000 },
      };
    },
  },
  {
    key: "manual_queue_depth",
    severity: "warning",
    windowSeconds: 60,
    async evaluate(now) {
      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM pgboss.job
        WHERE name = 'manual-queue' AND state IN ('created','retry','active')
      `.catch(() => [{ count: BigInt(0) }]);
      const count = Number(rows[0]?.count ?? 0);
      if (count <= 50) return null;
      return {
        severity: "warning",
        message: `manual review queue depth ${count} exceeds 50`,
        windowStart: now,
        windowEnd: now,
        measurement: { count, threshold: 50 },
      };
    },
  },
  {
    key: "broker_down_prolonged",
    severity: "critical",
    windowSeconds: 600,
    async evaluate(now) {
      // Broker has `lastHealthStatus` + `lastHealthCheckAt` in this schema.
      const tenMinsAgo = new Date(now.getTime() - 600_000);
      const count = await prisma.broker.count({
        where: {
          lastHealthStatus: "DOWN",
          lastHealthCheckAt: { lt: tenMinsAgo },
        },
      });
      if (count === 0) return null;
      return {
        severity: "critical",
        message: `${count} broker(s) DOWN for >10 min`,
        windowStart: tenMinsAgo,
        windowEnd: now,
        measurement: { count, threshold_seconds: 600 },
      };
    },
  },
  {
    key: "ftd_dropoff",
    severity: "warning",
    windowSeconds: 86400,
    async evaluate(now) {
      const todayStart = new Date(now.getTime() - 86400_000);
      const yesterdayStart = new Date(now.getTime() - 2 * 86400_000);
      const [todayCount, yestCount] = await Promise.all([
        prisma.leadEvent.count({
          where: { kind: "STATE_TRANSITION", createdAt: { gte: todayStart, lte: now } },
        }),
        prisma.leadEvent.count({
          where: {
            kind: "STATE_TRANSITION",
            createdAt: { gte: yesterdayStart, lt: todayStart },
          },
        }),
      ]);
      if (yestCount < 10) return null;
      const drop = 1 - todayCount / yestCount;
      if (drop <= 0.3) return null;
      return {
        severity: "warning",
        message: `FTD count ${todayCount} is ${(drop * 100).toFixed(0)}% below yesterday (${yestCount})`,
        windowStart: todayStart,
        windowEnd: now,
        measurement: { today: todayCount, yesterday: yestCount, drop, threshold: 0.3 },
      };
    },
  },
];
