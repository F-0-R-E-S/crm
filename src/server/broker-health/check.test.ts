import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { recordHealthCheck } from "./check";
import { aggregateHealthStatus } from "./status";

async function mkBroker() {
  return prisma.broker.create({
    data: {
      name: "h",
      endpointUrl: "https://example.com",
      fieldMapping: {} as object,
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
    },
  });
}

describe("broker-health recordHealthCheck + aggregateHealthStatus", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("пишет строку BrokerHealthCheck и обновляет broker.lastHealthStatus", async () => {
    const b = await mkBroker();
    await recordHealthCheck(b.id, {
      auth_status: "ok",
      http_status: 200,
      latency_ms: 123,
      error_class: null,
      error_message: null,
      sample_payload_masked: {},
      sample_response: { ok: true },
    });
    const rows = await prisma.brokerHealthCheck.findMany({ where: { brokerId: b.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ok");
    expect(rows[0].latencyMs).toBe(123);
    const fresh = await prisma.broker.findUnique({ where: { id: b.id } });
    expect(fresh?.lastHealthStatus).toBe("healthy");
    expect(fresh?.lastHealthCheckAt).toBeInstanceOf(Date);
  });

  it("3 подряд fail → aggregateHealthStatus = down", async () => {
    const b = await mkBroker();
    for (let i = 0; i < 3; i++) {
      await recordHealthCheck(b.id, {
        auth_status: "timeout",
        http_status: null,
        latency_ms: 5000,
        error_class: "timeout",
        error_message: "timeout",
        sample_payload_masked: {},
        sample_response: null,
      });
    }
    const s = await aggregateHealthStatus(b.id);
    expect(s).toBe("down");
  });

  it("1-2 подряд fail → degraded", async () => {
    const b = await mkBroker();
    await recordHealthCheck(b.id, {
      auth_status: "ok",
      http_status: 200,
      latency_ms: 100,
      error_class: null,
      error_message: null,
      sample_payload_masked: {},
      sample_response: null,
    });
    await recordHealthCheck(b.id, {
      auth_status: "http_5xx",
      http_status: 502,
      latency_ms: 150,
      error_class: "http_5xx",
      error_message: "http 502",
      sample_payload_masked: {},
      sample_response: null,
    });
    const s = await aggregateHealthStatus(b.id);
    expect(s).toBe("degraded");
  });

  it("последняя проба ok → healthy", async () => {
    const b = await mkBroker();
    await recordHealthCheck(b.id, {
      auth_status: "http_5xx",
      http_status: 502,
      latency_ms: 50,
      error_class: "http_5xx",
      error_message: "x",
      sample_payload_masked: {},
      sample_response: null,
    });
    await recordHealthCheck(b.id, {
      auth_status: "ok",
      http_status: 200,
      latency_ms: 80,
      error_class: null,
      error_message: null,
      sample_payload_masked: {},
      sample_response: null,
    });
    const s = await aggregateHealthStatus(b.id);
    expect(s).toBe("healthy");
  });
});
