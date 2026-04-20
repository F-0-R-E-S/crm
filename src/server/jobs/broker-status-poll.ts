import type { Job } from "pg-boss";
import { pollBrokerStatuses } from "@/server/broker-adapter/status-poll";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";

export async function handleBrokerStatusPoll(_job: Job<Record<string, never>>) {
  const brokers = await prisma.broker.findMany({
    where: { isActive: true, syncMode: "polling" },
    select: { id: true, pollIntervalMin: true, lastPolledAt: true, name: true },
  });
  const now = Date.now();
  let triggered = 0;

  for (const b of brokers) {
    const interval = (b.pollIntervalMin ?? 5) * 60 * 1000;
    const last = b.lastPolledAt?.getTime() ?? 0;
    if (now - last < interval) continue;
    try {
      const r = await pollBrokerStatuses(b.id);
      triggered++;
      logger.info(
        {
          event: "broker_status_poll_done",
          broker_id: b.id,
          polled: r.polled,
          updated: r.updated,
          unmapped: r.unmapped,
          http_status: r.httpStatus,
        },
        "poll done",
      );
    } catch (e) {
      logger.error(
        {
          event: "broker_status_poll_error",
          broker_id: b.id,
          err: (e as Error).message,
        },
        "poll failed",
      );
    }
  }

  logger.info(
    { event: "broker_status_poll_batch", triggered, total: brokers.length },
    "batch done",
  );
}
