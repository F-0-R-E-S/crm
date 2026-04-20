import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function mkBroker(name = "b") {
  return prisma.broker.create({
    data: {
      name,
      endpointUrl: "https://example.com/lead",
      fieldMapping: {},
      postbackSecret: "s",
      postbackLeadIdPath: "id",
      postbackStatusPath: "status",
    },
  });
}

describe("telegram admin commands — Prisma contract", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("pause then resume a broker flips isActive", async () => {
    const broker = await mkBroker();
    await prisma.broker.update({ where: { id: broker.id }, data: { isActive: false } });
    let b = await prisma.broker.findUnique({ where: { id: broker.id } });
    expect(b?.isActive).toBe(false);
    await prisma.broker.update({ where: { id: broker.id }, data: { isActive: true } });
    b = await prisma.broker.findUnique({ where: { id: broker.id } });
    expect(b?.isActive).toBe(true);
  });

  it("writes MANUAL_OVERRIDE LeadEvent for ack", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "a" } });
    const lead = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        traceId: "tr",
        eventTs: new Date(),
      },
    });
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        kind: "MANUAL_OVERRIDE",
        meta: { action: "fraud_hit_ack", by: "telegram", userId: "u1" },
      },
    });
    const ev = await prisma.leadEvent.findFirst({
      where: { leadId: lead.id, kind: "MANUAL_OVERRIDE" },
    });
    expect(ev).not.toBeNull();
    const meta = ev?.meta as { action?: string; by?: string };
    expect(meta.action).toBe("fraud_hit_ack");
    expect(meta.by).toBe("telegram");
  });
});
