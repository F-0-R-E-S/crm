import { metricSeries } from "@/server/analytics/service";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../helpers/db";

async function seedAff(name = "a") {
  return prisma.affiliate.create({ data: { name, contactEmail: `${name}@t.io` } });
}

async function seedDaily(
  date: Date,
  affiliateId: string,
  geo: string,
  totalReceived: number,
  extra: Partial<{
    totalAccepted: number;
    totalPushed: number;
    totalFtd: number;
    brokerId: string;
  }> = {},
) {
  return prisma.leadDailyRoll.create({
    data: {
      date,
      affiliateId,
      brokerId: extra.brokerId ?? "__none__",
      geo,
      totalReceived,
      totalAccepted: extra.totalAccepted ?? 0,
      totalPushed: extra.totalPushed ?? 0,
      totalFtd: extra.totalFtd ?? 0,
    },
  });
}

function d(iso: string): Date {
  return new Date(iso);
}

describe("metricSeries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns day-bucketed series with correct totals", async () => {
    const aff = await seedAff();
    await seedDaily(d("2026-06-01T00:00:00Z"), aff.id, "US", 10);
    await seedDaily(d("2026-06-02T00:00:00Z"), aff.id, "US", 15);
    await seedDaily(d("2026-06-03T00:00:00Z"), aff.id, "US", 20);

    const res = await metricSeries({
      from: d("2026-06-01T00:00:00Z"),
      to: d("2026-06-04T00:00:00Z"),
      groupBy: "day",
      filters: { affiliateIds: [], brokerIds: [], geos: [] },
      compareTo: null,
      metric: "leads",
    });
    expect(res.series).toHaveLength(3);
    expect(res.series.map((s) => s.value)).toEqual([10, 15, 20]);
    expect(res.total).toBe(45);
    expect(res.compare).toBeNull();
    expect(res.deltaPct).toBeNull();
  });

  it("computes previous_period compare with deltaPct", async () => {
    const aff = await seedAff();
    // compare window: 2026-05-30, 2026-05-31
    await seedDaily(d("2026-05-30T00:00:00Z"), aff.id, "US", 10);
    await seedDaily(d("2026-05-31T00:00:00Z"), aff.id, "US", 10);
    // current window: 2026-06-01, 2026-06-02
    await seedDaily(d("2026-06-01T00:00:00Z"), aff.id, "US", 15);
    await seedDaily(d("2026-06-02T00:00:00Z"), aff.id, "US", 15);

    const res = await metricSeries({
      from: d("2026-06-01T00:00:00Z"),
      to: d("2026-06-03T00:00:00Z"),
      groupBy: "day",
      filters: { affiliateIds: [], brokerIds: [], geos: [] },
      compareTo: "previous_period",
      metric: "leads",
    });
    expect(res.total).toBe(30);
    expect(res.compare).not.toBeNull();
    expect(res.compare?.total).toBe(20);
    expect(res.deltaPct).not.toBeNull();
    expect(Math.abs((res.deltaPct as number) - 50)).toBeLessThan(0.001);
  });

  it("applies affiliateIds filter", async () => {
    const a = await seedAff("a");
    const b = await seedAff("b");
    await seedDaily(d("2026-06-01T00:00:00Z"), a.id, "US", 10);
    await seedDaily(d("2026-06-01T00:00:00Z"), b.id, "US", 99);

    const res = await metricSeries({
      from: d("2026-06-01T00:00:00Z"),
      to: d("2026-06-02T00:00:00Z"),
      groupBy: "day",
      filters: { affiliateIds: [a.id], brokerIds: [], geos: [] },
      compareTo: null,
      metric: "leads",
    });
    expect(res.total).toBe(10);
  });
});
