import { prisma } from "@/server/db";
import { computePnL } from "@/server/finance/pnl";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAffiliate, seedBroker, seedLead } from "../helpers/seed";

describe("computePnL", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("aggregates revenue and payout across multiple conversions", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    const lead1 = await seedLead({ brokerId: broker.id, affiliateId: aff.id });
    const lead2 = await seedLead({ brokerId: broker.id, affiliateId: aff.id });

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

    const t = new Date("2026-06-15T10:00:00Z");
    await prisma.conversion.createMany({
      data: [
        {
          leadId: lead1.id,
          kind: "FTD",
          amount: new Prisma.Decimal(500),
          occurredAt: t,
          brokerReportedAt: t,
        },
        {
          leadId: lead2.id,
          kind: "FTD",
          amount: new Prisma.Decimal(800),
          occurredAt: t,
          brokerReportedAt: t,
        },
      ],
    });

    const r = await computePnL({
      from: new Date("2026-06-01"),
      to: new Date("2026-07-01"),
    });

    expect(r.revenue.toString()).toBe("400"); // 200 * 2
    expect(r.payout.toString()).toBe("300"); // 150 * 2
    expect(r.margin.toString()).toBe("100");
    expect(Math.round(r.marginPct)).toBe(25);
    expect(r.conversionCount).toBe(2);
    expect(r.breakdown.byKind.FTD.count).toBe(2);
  });

  it("filters by affiliate", async () => {
    const aff1 = await seedAffiliate();
    const aff2 = await seedAffiliate();
    const broker = await seedBroker();
    const lead1 = await seedLead({ brokerId: broker.id, affiliateId: aff1.id });
    const lead2 = await seedLead({ brokerId: broker.id, affiliateId: aff2.id });
    await prisma.brokerPayoutRule.create({
      data: {
        brokerId: broker.id,
        kind: "CPA_FIXED",
        cpaAmount: new Prisma.Decimal(100),
        activeFrom: new Date("2026-01-01"),
      },
    });

    const t = new Date("2026-06-15T10:00:00Z");
    await prisma.conversion.createMany({
      data: [
        {
          leadId: lead1.id,
          kind: "FTD",
          amount: new Prisma.Decimal(0),
          occurredAt: t,
          brokerReportedAt: t,
        },
        {
          leadId: lead2.id,
          kind: "FTD",
          amount: new Prisma.Decimal(0),
          occurredAt: t,
          brokerReportedAt: t,
        },
      ],
    });

    const r = await computePnL({
      from: new Date("2026-06-01"),
      to: new Date("2026-07-01"),
      affiliateId: aff1.id,
    });
    expect(r.conversionCount).toBe(1);
    expect(r.revenue.toString()).toBe("100");
  });
});
