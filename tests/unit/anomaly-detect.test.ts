import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

const emitMock = vi.fn().mockResolvedValue(1);
vi.mock("@/server/telegram/emit", () => ({
  emitTelegramEvent: (...args: unknown[]) => emitMock(...args),
}));

const { detectAnomalies } = await import("@/server/jobs/anomaly-detect");

async function seedLeads(count: number, createdAt: Date) {
  const aff = await prisma.affiliate.create({ data: { name: `A-${Date.now()}-${Math.random()}` } });
  const rows = Array.from({ length: count }, (_, i) => ({
    affiliateId: aff.id,
    geo: "US",
    ip: "1.2.3.4",
    traceId: `tr-${Date.now()}-${Math.random()}-${i}`,
    eventTs: createdAt,
    createdAt,
  }));
  await prisma.lead.createMany({ data: rows });
}

describe("detectAnomalies", () => {
  beforeEach(async () => {
    await resetDb();
    emitMock.mockClear();
  });

  it("emits 0 when prior hour has < 10 leads", async () => {
    const hourMs = 60 * 60 * 1000;
    const now = new Date();
    const endOfCurrent = new Date(Math.floor(now.getTime() / hourMs) * hourMs);
    const startOfCurrent = new Date(endOfCurrent.getTime() - hourMs);
    const startOfPrev = new Date(startOfCurrent.getTime() - hourMs);
    const midPrev = new Date(startOfPrev.getTime() + hourMs / 2);
    await seedLeads(5, midPrev);
    await detectAnomalies(now);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("emits ANOMALY_DETECTED when >=50% drop on a qualifying window", async () => {
    const hourMs = 60 * 60 * 1000;
    const now = new Date();
    const endOfCurrent = new Date(Math.floor(now.getTime() / hourMs) * hourMs);
    const startOfCurrent = new Date(endOfCurrent.getTime() - hourMs);
    const startOfPrev = new Date(startOfCurrent.getTime() - hourMs);
    const midPrev = new Date(startOfPrev.getTime() + hourMs / 2);
    const midCurr = new Date(startOfCurrent.getTime() + hourMs / 2);
    await seedLeads(20, midPrev);
    await seedLeads(5, midCurr);
    await detectAnomalies(now);
    expect(emitMock).toHaveBeenCalledTimes(1);
    expect(emitMock.mock.calls[0][0]).toBe("ANOMALY_DETECTED");
    const payload = emitMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.priorHour).toBe(20);
    expect(payload.currentHour).toBe(5);
    expect(payload.dropPercent).toBe(75);
  });
});
