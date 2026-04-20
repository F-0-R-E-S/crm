import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { aggregateBrokerErrors, computeSla } from "./aggregator";

async function seed() {
  const aff = await prisma.affiliate.create({ data: { name: "a" } });
  const b = await prisma.broker.create({
    data: {
      name: "e",
      endpointUrl: "https://example.com",
      fieldMapping: {} as object,
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
    },
  });
  return { broker: b, affiliate: aff };
}

async function pushEvent(
  brokerId: string,
  affId: string,
  kind: "BROKER_PUSH_SUCCESS" | "BROKER_PUSH_FAIL",
  meta: object,
) {
  const lead = await prisma.lead.create({
    data: {
      affiliateId: affId,
      brokerId,
      geo: "UA",
      ip: "1.1.1.1",
      eventTs: new Date(),
      traceId: `t-${Math.random()}`,
      state: kind === "BROKER_PUSH_SUCCESS" ? "PUSHED" : "FAILED",
    },
  });
  await prisma.leadEvent.create({
    data: { leadId: lead.id, kind, meta: meta as object },
  });
}

describe("aggregateBrokerErrors", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("считает error_rate, timeout_rate, top codes", async () => {
    const { broker, affiliate } = await seed();
    const from = new Date(Date.now() - 3600_000);
    const to = new Date(Date.now() + 3600_000);

    await pushEvent(broker.id, affiliate.id, "BROKER_PUSH_SUCCESS", {
      httpStatus: 200,
      durationMs: 120,
    });
    await pushEvent(broker.id, affiliate.id, "BROKER_PUSH_SUCCESS", {
      httpStatus: 200,
      durationMs: 150,
    });
    await pushEvent(broker.id, affiliate.id, "BROKER_PUSH_FAIL", {
      httpStatus: 504,
      durationMs: 5000,
      error: "timeout",
    });
    await pushEvent(broker.id, affiliate.id, "BROKER_PUSH_FAIL", {
      httpStatus: 502,
      durationMs: 200,
      error: "http 502",
    });
    await pushEvent(broker.id, affiliate.id, "BROKER_PUSH_FAIL", {
      httpStatus: 502,
      durationMs: 210,
      error: "http 502",
    });

    const res = await aggregateBrokerErrors({ brokerId: broker.id, from, to });
    expect(res.total_pushes).toBe(5);
    expect(res.success_pushes).toBe(2);
    expect(res.error_pushes).toBe(3);
    expect(res.error_rate).toBeCloseTo(0.6, 2);
    expect(res.timeout_rate).toBeCloseTo(0.2, 2);
    const top = res.top_error_codes;
    expect(top[0].code).toBe("http_502");
    expect(top[0].count).toBe(2);
  });

  it("computeSla формирует alerts при error_rate>5% и latency_p95>3s", () => {
    const alerts = computeSla({
      total_pushes: 100,
      success_pushes: 90,
      error_pushes: 10,
      timeout_pushes: 3,
      error_rate: 0.1,
      timeout_rate: 0.03,
      latency_p95_ms: 3500,
      latency_p50_ms: 500,
      top_error_codes: [],
    });
    expect(alerts.error_rate_alert).toBe(true);
    expect(alerts.latency_p95_alert).toBe(true);
  });
});
