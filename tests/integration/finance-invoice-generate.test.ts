import { prisma } from "@/server/db";
import { generateAffiliateInvoice, generateBrokerInvoice } from "@/server/finance/invoice-generate";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAffiliate, seedBroker, seedLead } from "../helpers/seed";

const PERIOD = {
  start: new Date("2026-06-01"),
  end: new Date("2026-07-01"),
};

describe("invoice generation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("builds a broker invoice and links a matching affiliate invoice 1:1", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    await prisma.brokerPayoutRule.create({
      data: {
        brokerId: broker.id,
        kind: "CPA_FIXED",
        cpaAmount: new Prisma.Decimal(200),
        activeFrom: new Date("2026-01-01"),
      },
    });
    await prisma.affiliatePayoutRule.create({
      data: {
        affiliateId: aff.id,
        kind: "CPA_FIXED",
        cpaAmount: new Prisma.Decimal(150),
        activeFrom: new Date("2026-01-01"),
      },
    });
    const lead = await seedLead({ affiliateId: aff.id, brokerId: broker.id });
    await prisma.conversion.create({
      data: {
        leadId: lead.id,
        kind: "FTD",
        amount: new Prisma.Decimal(500),
        occurredAt: new Date("2026-06-15"),
        brokerReportedAt: new Date(),
      },
    });

    const bi = await generateBrokerInvoice(broker.id, PERIOD);
    expect(bi.amount.toString()).toBe("200");

    const ai = await generateAffiliateInvoice(aff.id, PERIOD);
    expect(ai.amount.toString()).toBe("150");
    expect(ai.brokerInvoiceId).toBe(bi.id);
  });

  it("does not link when conversions span multiple brokers (MVP 1:1 rule)", async () => {
    const aff = await seedAffiliate();
    const broker1 = await seedBroker();
    const broker2 = await seedBroker();
    await prisma.brokerPayoutRule.createMany({
      data: [
        {
          brokerId: broker1.id,
          kind: "CPA_FIXED",
          cpaAmount: new Prisma.Decimal(100),
          activeFrom: new Date("2026-01-01"),
        },
        {
          brokerId: broker2.id,
          kind: "CPA_FIXED",
          cpaAmount: new Prisma.Decimal(100),
          activeFrom: new Date("2026-01-01"),
        },
      ],
    });
    await prisma.affiliatePayoutRule.create({
      data: {
        affiliateId: aff.id,
        kind: "CPA_FIXED",
        cpaAmount: new Prisma.Decimal(50),
        activeFrom: new Date("2026-01-01"),
      },
    });
    const l1 = await seedLead({ affiliateId: aff.id, brokerId: broker1.id });
    const l2 = await seedLead({ affiliateId: aff.id, brokerId: broker2.id });
    await prisma.conversion.createMany({
      data: [
        {
          leadId: l1.id,
          kind: "FTD",
          amount: new Prisma.Decimal(0),
          occurredAt: new Date("2026-06-10"),
          brokerReportedAt: new Date(),
        },
        {
          leadId: l2.id,
          kind: "FTD",
          amount: new Prisma.Decimal(0),
          occurredAt: new Date("2026-06-12"),
          brokerReportedAt: new Date(),
        },
      ],
    });
    await generateBrokerInvoice(broker1.id, PERIOD);
    await generateBrokerInvoice(broker2.id, PERIOD);

    const ai = await generateAffiliateInvoice(aff.id, PERIOD);
    expect(ai.brokerInvoiceId).toBeNull();
  });
});
