import { prisma } from "@/server/db";
import type { AutologinStage } from "@prisma/client";

export interface SlaWindow {
  from: Date;
  to: Date;
}

export interface SlaResult {
  total: number;
  successful: number;
  failed: number;
  uptime_pct: number;
  p50_duration_ms: number | null;
  p95_duration_ms: number | null;
  by_stage_failed: Record<AutologinStage, number>;
  window: { from: string; to: string };
}

type AggregateTotals = {
  total: bigint;
  successful: bigint;
  failed: bigint;
  p50: number | null;
  p95: number | null;
};

type AggregateByStage = {
  errorStage: AutologinStage | null;
  n: bigint;
};

export async function computeSla({ from, to }: SlaWindow): Promise<SlaResult> {
  const totals = await prisma.$queryRaw<AggregateTotals[]>`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::bigint AS successful,
      COUNT(*) FILTER (WHERE status = 'FAILED')::bigint AS failed,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY "durationMs")::float AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs")::float AS p95
    FROM "AutologinAttempt"
    WHERE "startedAt" >= ${from} AND "startedAt" < ${to}
      AND status IN ('SUCCEEDED','FAILED')
  `;
  const byStage = await prisma.$queryRaw<AggregateByStage[]>`
    SELECT "errorStage", COUNT(*)::bigint AS n
    FROM "AutologinAttempt"
    WHERE status = 'FAILED'
      AND "startedAt" >= ${from} AND "startedAt" < ${to}
      AND "errorStage" IS NOT NULL
    GROUP BY "errorStage"
  `;

  const t = totals[0] ?? {
    total: 0n,
    successful: 0n,
    failed: 0n,
    p50: null,
    p95: null,
  };
  const total = Number(t.total);
  const successful = Number(t.successful);
  const failed = Number(t.failed);
  const uptime_pct = total === 0 ? 0 : (successful / total) * 100;

  const by_stage_failed: Record<AutologinStage, number> = {
    INITIATING: 0,
    CAPTCHA: 0,
    AUTHENTICATING: 0,
    SESSION_READY: 0,
  };
  for (const row of byStage) {
    if (row.errorStage) by_stage_failed[row.errorStage] = Number(row.n);
  }

  return {
    total,
    successful,
    failed,
    uptime_pct,
    p50_duration_ms: t.p50 == null ? null : Math.round(t.p50),
    p95_duration_ms: t.p95 == null ? null : Math.round(t.p95),
    by_stage_failed,
    window: { from: from.toISOString(), to: to.toISOString() },
  };
}
