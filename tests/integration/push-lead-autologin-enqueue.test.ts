import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

// Shared mock state hoisted for vi.mock.
const sent: Array<{ name: string; data: unknown; opts?: unknown }> = [];

vi.mock("@/server/jobs/queue", async () => {
  const actual =
    await vi.importActual<typeof import("@/server/jobs/queue")>("@/server/jobs/queue");
  const fakeBoss = {
    send: async (name: string, data: unknown, opts?: unknown) => {
      sent.push({ name, data, opts });
      return "fake-id";
    },
  };
  return {
    ...actual,
    getBoss: () => fakeBoss,
    startBossOnce: async () => fakeBoss,
  };
});

vi.mock("@/server/broker-adapter/push", () => ({
  pushToBroker: async () => ({
    success: true,
    httpStatus: 200,
    durationMs: 10,
    attemptN: 1,
    externalId: "br-123",
  }),
}));

async function baseSeed(autologinEnabled: boolean) {
  const aff = await prisma.affiliate.create({ data: { name: "aff-enq" } });
  const broker = await prisma.broker.create({
    data: {
      name: "b-enq",
      endpointUrl: "https://example.com/push",
      fieldMapping: { firstName: "first_name" } as object,
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
      autologinEnabled,
      autologinLoginUrl: autologinEnabled ? "http://mock/login" : null,
    },
  });
  await prisma.rotationRule.create({
    data: { geo: "US", brokerId: broker.id, priority: 1 },
  });
  const lead = await prisma.lead.create({
    data: {
      affiliateId: aff.id,
      geo: "US",
      ip: "1.2.3.4",
      eventTs: new Date(),
      email: "u@example.com",
      traceId: `enq-${Math.random()}`,
    },
  });
  return { leadId: lead.id, brokerId: broker.id };
}

describe("push-lead enqueues autologin-attempt", () => {
  beforeEach(async () => {
    await resetDb();
    sent.length = 0;
  });

  it("enqueues autologin-attempt when Broker.autologinEnabled=true", async () => {
    const { handlePushLead } = await import("@/server/jobs/push-lead");
    const { leadId, brokerId } = await baseSeed(true);
    await handlePushLead({ leadId, traceId: "tr-a" });

    const autologinSends = sent.filter((s) => s.name === "autologin-attempt");
    expect(autologinSends).toHaveLength(1);
    const data = autologinSends[0].data as Record<string, unknown>;
    expect(data.leadId).toBe(leadId);
    expect(data.brokerId).toBe(brokerId);
    expect(data.adapterId).toBe("mock");
    expect(data.loginUrl).toBe("http://mock/login");
  });

  it("does NOT enqueue when Broker.autologinEnabled=false", async () => {
    const { handlePushLead } = await import("@/server/jobs/push-lead");
    const { leadId } = await baseSeed(false);
    await handlePushLead({ leadId, traceId: "tr-b" });

    const autologinSends = sent.filter((s) => s.name === "autologin-attempt");
    expect(autologinSends).toHaveLength(0);
  });
});
