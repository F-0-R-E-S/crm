import { prisma } from "@/server/db";
import { handlePushLead } from "@/server/jobs/push-lead";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { type MockBroker, startMockBroker } from "../helpers/mock-broker";

describe("handlePushLead", () => {
  let mb: MockBroker;
  let affId = "";
  let brokerId = "";
  let leadId = "";

  beforeEach(async () => {
    await resetDb();
    mb = await startMockBroker();
    const aff = await prisma.affiliate.create({ data: { name: "rt-aff" } });
    affId = aff.id;
    const broker = await prisma.broker.create({
      data: {
        name: "rt-broker",
        endpointUrl: `http://127.0.0.1:${mb.port}/push`,
        fieldMapping: { firstName: "first_name", geo: "country" },
        postbackSecret: "s",
        postbackLeadIdPath: "id",
        postbackStatusPath: "status",
        responseIdPath: "id",
      },
    });
    brokerId = broker.id;
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId, priority: 1 } });
    const lead = await prisma.lead.create({
      data: {
        affiliateId: affId,
        firstName: "X",
        geo: "UA",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "rt-t-1",
      },
    });
    leadId = lead.id;
  });
  afterEach(async () => {
    await mb.stop();
  });

  it("PUSHES and records BROKER_PUSH_SUCCESS", async () => {
    mb.respondWith(200, { id: "ext-abc", status: "accepted" });
    await handlePushLead({ leadId, traceId: "rt-t-1" });
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.state).toBe("PUSHED");
    expect(lead?.brokerExternalId).toBe("ext-abc");
    expect(mb.received[0].body).toMatchObject({ first_name: "X", country: "UA" });
    const events = await prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => e.kind)).toContain("BROKER_PUSH_SUCCESS");
  });

  it(
    "FAILS with pool_exhausted when the only broker returns 500 repeatedly",
    async () => {
      mb.respondWith(500, { error: "boom" });
      // attemptN=5 exhausts the default retry schedule (5 slots) so we reach FAILED.
      await handlePushLead({ leadId, traceId: "rt-t-1", attemptN: 5 });
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      expect(lead?.state).toBe("FAILED");
      // Pool iteration tried every broker and they all push-failed.
      expect(lead?.rejectReason).toBe("pool_exhausted");
      const events = await prisma.leadEvent.findMany({
        where: { leadId },
        orderBy: { createdAt: "asc" },
      });
      const kinds = events.map((e) => e.kind);
      expect(kinds).toContain("BROKER_PUSH_FAIL");
      expect(kinds).toContain("NO_BROKER_AVAILABLE");
    },
    { timeout: 20_000 },
  );

  it("NO_BROKER_AVAILABLE when all brokers over cap", async () => {
    await prisma.broker.update({ where: { id: brokerId }, data: { dailyCap: 0 } });
    await handlePushLead({ leadId, traceId: "rt-t-1" });
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.state).toBe("FAILED");
    expect(lead?.rejectReason).toBe("no_broker_available");
  });
});
