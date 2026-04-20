import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

const emitMock = vi.fn().mockResolvedValue(1);
vi.mock("@/server/telegram/emit", () => ({
  emitTelegramEvent: (...args: unknown[]) => emitMock(...args),
}));

const { sendDailySummaries } = await import("@/server/jobs/daily-summary");

describe("sendDailySummaries", () => {
  beforeEach(async () => {
    await resetDb();
    emitMock.mockClear();
  });

  it("emits one DAILY_SUMMARY and one AFFILIATE_DAILY_SUMMARY per affiliate", async () => {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setUTCHours(0, 0, 0, 0);
    const yesterdayMid = new Date(startToday.getTime() - 12 * 60 * 60 * 1000);

    const a1 = await prisma.affiliate.create({ data: { name: "Alpha" } });
    const a2 = await prisma.affiliate.create({ data: { name: "Beta" } });
    await prisma.lead.create({
      data: {
        affiliateId: a1.id,
        geo: "US",
        ip: "1.1.1.1",
        traceId: "tr-a1",
        eventTs: yesterdayMid,
        createdAt: yesterdayMid,
      },
    });
    await prisma.lead.create({
      data: {
        affiliateId: a2.id,
        geo: "US",
        ip: "1.1.1.1",
        traceId: "tr-a2",
        eventTs: yesterdayMid,
        createdAt: yesterdayMid,
      },
    });
    await sendDailySummaries(now);
    const dailyCalls = emitMock.mock.calls.filter((c) => c[0] === "DAILY_SUMMARY");
    const perAffCalls = emitMock.mock.calls.filter(
      (c) => c[0] === "AFFILIATE_DAILY_SUMMARY",
    );
    expect(dailyCalls.length).toBe(1);
    expect(perAffCalls.length).toBe(2);
  });
});
