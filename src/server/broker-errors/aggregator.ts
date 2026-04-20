import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export interface AggregateInput {
  brokerId: string;
  from: Date;
  to: Date;
}

export interface AggregateResult {
  total_pushes: number;
  success_pushes: number;
  error_pushes: number;
  timeout_pushes: number;
  error_rate: number;
  timeout_rate: number;
  latency_p95_ms: number | null;
  latency_p50_ms: number | null;
  top_error_codes: Array<{ code: string; count: number }>;
}

interface PushEventMeta {
  httpStatus?: number | null;
  durationMs?: number | null;
  error?: string | null;
}

function errorCodeOf(meta: PushEventMeta): string {
  if (meta.error && /timeout|aborted/i.test(meta.error)) return "timeout";
  if (meta.httpStatus) return `http_${meta.httpStatus}`;
  return "network_error";
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export async function aggregateBrokerErrors(input: AggregateInput): Promise<AggregateResult> {
  const events = await prisma.leadEvent.findMany({
    where: {
      lead: { brokerId: input.brokerId },
      kind: { in: ["BROKER_PUSH_SUCCESS", "BROKER_PUSH_FAIL"] },
      createdAt: { gte: input.from, lt: input.to },
    },
    select: { kind: true, meta: true },
  });

  let success = 0;
  let fail = 0;
  let timeouts = 0;
  const latencies: number[] = [];
  const codeCounts: Record<string, number> = {};

  for (const ev of events) {
    const meta = (ev.meta ?? {}) as PushEventMeta;
    if (typeof meta.durationMs === "number" && meta.durationMs >= 0)
      latencies.push(meta.durationMs);
    if (ev.kind === "BROKER_PUSH_SUCCESS") {
      success++;
    } else {
      fail++;
      const code = errorCodeOf(meta);
      if (code === "timeout") timeouts++;
      codeCounts[code] = (codeCounts[code] ?? 0) + 1;
    }
  }
  latencies.sort((a, b) => a - b);

  const total = success + fail;
  return {
    total_pushes: total,
    success_pushes: success,
    error_pushes: fail,
    timeout_pushes: timeouts,
    error_rate: total === 0 ? 0 : fail / total,
    timeout_rate: total === 0 ? 0 : timeouts / total,
    latency_p95_ms: percentile(latencies, 95),
    latency_p50_ms: percentile(latencies, 50),
    top_error_codes: Object.entries(codeCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export interface SlaAlerts {
  error_rate_alert: boolean;
  latency_p95_alert: boolean;
}

export function computeSla(r: AggregateResult): SlaAlerts {
  return {
    error_rate_alert: r.total_pushes >= 10 && r.error_rate > 0.05,
    latency_p95_alert: r.latency_p95_ms !== null && r.latency_p95_ms > 3000,
  };
}

export async function writeErrorSample(
  brokerId: string,
  bucketStart: Date,
  bucketIntervalSec: number,
  r: AggregateResult,
): Promise<void> {
  await prisma.brokerErrorSample.upsert({
    where: {
      brokerId_bucketStart_bucketIntervalSec: {
        brokerId,
        bucketStart,
        bucketIntervalSec,
      },
    },
    create: {
      brokerId,
      bucketStart,
      bucketIntervalSec,
      totalPushes: r.total_pushes,
      successPushes: r.success_pushes,
      errorPushes: r.error_pushes,
      timeoutPushes: r.timeout_pushes,
      latencyP95Ms: r.latency_p95_ms,
      topErrorCodes: r.top_error_codes as unknown as Prisma.InputJsonValue,
    },
    update: {
      totalPushes: r.total_pushes,
      successPushes: r.success_pushes,
      errorPushes: r.error_pushes,
      timeoutPushes: r.timeout_pushes,
      latencyP95Ms: r.latency_p95_ms,
      topErrorCodes: r.top_error_codes as unknown as Prisma.InputJsonValue,
    },
  });
}
