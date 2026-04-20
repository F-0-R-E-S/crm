import type { TestConnectionResult } from "@/server/broker-adapter/test-connection";
import { prisma } from "@/server/db";
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
  const aggregated = await aggregateHealthStatus(brokerId);
  await prisma.broker.update({
    where: { id: brokerId },
    data: { lastHealthStatus: aggregated, lastHealthCheckAt: new Date() },
  });
}
