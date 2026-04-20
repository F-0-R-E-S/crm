import {
  type TestConnectionBroker,
  testBrokerConnection,
} from "@/server/broker-adapter/test-connection";
import { recordHealthCheck } from "@/server/broker-health/check";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import type { Job } from "pg-boss";

export async function handleBrokerHealthCheck(_job: Job<Record<string, never>>) {
  const brokers = await prisma.broker.findMany({ where: { isActive: true } });
  for (const b of brokers) {
    const input: TestConnectionBroker = {
      id: b.id,
      endpointUrl: b.endpointUrl,
      httpMethod: b.httpMethod,
      authType: b.authType,
      authConfig: b.authConfig as Record<string, unknown>,
      headers: (b.headers as Record<string, string>) ?? {},
      fieldMapping: b.fieldMapping as unknown as TestConnectionBroker["fieldMapping"],
      staticPayload: (b.staticPayload as Record<string, unknown>) ?? {},
    };
    try {
      const r = await testBrokerConnection(input, { timeoutMs: 5000 });
      await recordHealthCheck(b.id, r);
    } catch (e) {
      logger.error(
        {
          event: "broker_health_check_error",
          broker_id: b.id,
          err: (e as Error).message,
        },
        "health-check failed",
      );
    }
  }
  logger.info({ event: "broker_health_check_batch", count: brokers.length }, "batch done");
}
