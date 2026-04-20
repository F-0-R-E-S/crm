import type { TestConnectionResult } from "@/server/broker-adapter/test-connection";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { emitTelegramEvent } from "@/server/telegram/emit";
import { aggregateHealthStatus } from "./status";

export async function recordHealthCheck(brokerId: string, r: TestConnectionResult): Promise<void> {
  await prisma.brokerHealthCheck.create({
    data: {
      brokerId,
      status: r.auth_status,
      latencyMs: r.latency_ms,
      httpStatus: r.http_status,
      errorText: r.error_message,
    },
  });
  const before = await prisma.broker.findUnique({
    where: { id: brokerId },
    select: { lastHealthStatus: true, name: true, lastHealthCheckAt: true },
  });
  const aggregated = await aggregateHealthStatus(brokerId);
  await prisma.broker.update({
    where: { id: brokerId },
    data: { lastHealthStatus: aggregated, lastHealthCheckAt: new Date() },
  });
  // Edge-triggered telegram events.
  if (before && before.lastHealthStatus !== aggregated) {
    if (aggregated === "down") {
      const recent = await prisma.brokerHealthCheck.findMany({
        where: { brokerId, status: { not: "ok" } },
        orderBy: { checkedAt: "desc" },
        take: 5,
        select: { errorText: true },
      });
      void emitTelegramEvent(
        "BROKER_DOWN",
        {
          brokerId,
          brokerName: before.name,
          errorStreak: recent.length,
          lastError: recent[0]?.errorText ?? "—",
        },
        { brokerId },
      ).catch((e) =>
        logger.warn({ err: (e as Error).message }, "[telegram-emit] BROKER_DOWN failed"),
      );
    } else if (aggregated === "healthy" && before.lastHealthStatus === "down") {
      const downtimeMin =
        before.lastHealthCheckAt != null
          ? Math.round((Date.now() - before.lastHealthCheckAt.getTime()) / 60_000)
          : null;
      void emitTelegramEvent(
        "BROKER_RECOVERED",
        { brokerId, brokerName: before.name, downtimeMinutes: downtimeMin },
        { brokerId },
      ).catch((e) =>
        logger.warn({ err: (e as Error).message }, "[telegram-emit] BROKER_RECOVERED failed"),
      );
    }
  }
}
