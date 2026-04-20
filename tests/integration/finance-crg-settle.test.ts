import { prisma } from "@/server/db";
import { runCrgCohortSettle } from "@/server/jobs/crg-cohort-settle";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAffiliate, seedBroker, seedLead } from "../helpers/seed";

describe("crg cohort settlement", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("marks a cohort MET when FTD rate >= guaranteed", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    await prisma.brokerPayoutRule.create({
      data: {
        brokerId: broker.id,
        kind: "CPA_CRG",
        cpaAmount: new Prisma.Decimal(100),
        crgRate: new Prisma.Decimal("0.10"),
        activeFrom: new Date("2026-01-01"),
      },
    });

    // 10 accepted leads, 2 FTD → 20% rate, above 10% guaranteed
    const cohortStart = new Date("2026-06-01T00:00:00Z"); // Monday
    for (let i = 0; i < 10; i++) {
      const lead = await seedLead({
        brokerId: broker.id,
        affiliateId: aff.id,
        acceptedAt: new Date("2026-06-02T12:00:00Z"),
      });
      if (i < 2) {
        await prisma.conversion.create({
          data: {
            leadId: lead.id,
            kind: "FTD",
            amount: new Prisma.Decimal(250),
            occurredAt: new Date("2026-06-10T12:00:00Z"),
            brokerReportedAt: new Date(),
          },
        });
      }
    }

    const now = new Date("2026-07-15T04:00:00Z");
    await runCrgCohortSettle(now);

    const cohort = await prisma.cRGCohort.findFirst({
      where: { brokerId: broker.id, cohortStart },
    });
    expect(cohort?.status).toBe("MET");
    expect(cohort?.shortfallAmount).toBeNull();
  });

  it("marks a cohort SHORTFALL and computes clawback when FTD rate < guaranteed", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    await prisma.brokerPayoutRule.create({
      data: {
        brokerId: broker.id,
        kind: "CPA_CRG",
        cpaAmount: new Prisma.Decimal(100),
        crgRate: new Prisma.Decimal("0.20"),
        activeFrom: new Date("2026-01-01"),
      },
    });

    // 10 accepted, 1 FTD → 10% vs 20% guaranteed → shortfall 10 pp
    // Shortfall = 0.10 * 10 * 100 = 100
    for (let i = 0; i < 10; i++) {
      const lead = await seedLead({
        brokerId: broker.id,
        affiliateId: aff.id,
        acceptedAt: new Date("2026-06-02T12:00:00Z"),
      });
      if (i < 1) {
        await prisma.conversion.create({
          data: {
            leadId: lead.id,
            kind: "FTD",
            amount: new Prisma.Decimal(250),
            occurredAt: new Date("2026-06-10T12:00:00Z"),
            brokerReportedAt: new Date(),
          },
        });
      }
    }

    await runCrgCohortSettle(new Date("2026-07-15T04:00:00Z"));

    const cohort = await prisma.cRGCohort.findFirst({
      where: {
        brokerId: broker.id,
        cohortStart: new Date("2026-06-01T00:00:00Z"),
      },
    });
    expect(cohort?.status).toBe("SHORTFALL");
    expect(cohort?.shortfallAmount?.toString()).toBe("100");
  });
});
