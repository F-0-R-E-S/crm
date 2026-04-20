import { aggregateBrokerErrors, writeErrorSample } from "@/server/broker-errors/aggregator";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import type { Job } from "pg-boss";

const BUCKET_SEC = 300;

function floorTo(bucketSec: number, d: Date): Date {
  const ts = Math.floor(d.getTime() / (bucketSec * 1000)) * bucketSec * 1000;
  return new Date(ts);
}

export async function handleBrokerErrorAggregator(_job: Job<Record<string, never>>) {
  const brokers = await prisma.broker.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const bucketStart = floorTo(BUCKET_SEC, new Date(Date.now() - BUCKET_SEC * 1000));
  const from = bucketStart;
  const to = new Date(bucketStart.getTime() + BUCKET_SEC * 1000);

  for (const b of brokers) {
    const r = await aggregateBrokerErrors({ brokerId: b.id, from, to });
    if (r.total_pushes === 0) continue;
    await writeErrorSample(b.id, bucketStart, BUCKET_SEC, r);
  }
  logger.info(
    {
      event: "broker_error_aggregator_batch",
      count: brokers.length,
      bucketStart,
    },
    "aggregator done",
  );
}
