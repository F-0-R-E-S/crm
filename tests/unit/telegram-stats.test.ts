import { prisma } from "@/server/db";
import { todayStats } from "@/server/telegram/stats";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("todayStats", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("groups leads by state and computes counters", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "A" } });
    const now = new Date();
    const baseLead = {
      affiliateId: aff.id,
      geo: "US",
      ip: "1.2.3.4",
      traceId: "t",
      eventTs: now,
    };
    await prisma.lead.createMany({
      data: [
        { ...baseLead, traceId: "t1", state: "PUSHED" },
        { ...baseLead, traceId: "t2", state: "ACCEPTED" },
        { ...baseLead, traceId: "t3", state: "ACCEPTED" },
        { ...baseLead, traceId: "t4", state: "REJECTED", rejectReason: "bl" },
      ],
    });
    const s = await todayStats();
    expect(s.intake).toBe(4);
    expect(s.pushed).toBe(1);
    expect(s.accepted).toBe(2);
    expect(s.rejected).toBe(1);
    expect(s.ftd).toBe(0);
    expect(s.declined).toBe(0);
  });
});
