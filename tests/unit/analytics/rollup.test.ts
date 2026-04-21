import { refreshDailyRollups, refreshHourlyRollups } from "@/server/analytics/rollup";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../helpers/db";

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function dayEnd(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

async function seedAffAndBroker() {
  const aff = await prisma.affiliate.create({
    data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 10000 },
  });
  const bk = await prisma.broker.create({
    data: {
      name: "b",
      endpointUrl: "https://example.test/mock",
      fieldMapping: {},
      postbackSecret: "s",
      postbackLeadIdPath: "id",
      postbackStatusPath: "status",
      isActive: true,
    },
  });
  return { aff, bk };
}

describe("refreshDailyRollups / refreshHourlyRollups", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("aggregates 3 FTD leads into a single daily row", async () => {
    const { aff, bk } = await seedAffAndBroker();
    const now = new Date("2026-06-15T14:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      await prisma.lead.create({
        data: {
          affiliateId: aff.id,
          brokerId: bk.id,
          geo: "US",
          ip: "1.1.1.1",
          eventTs: now,
          state: "FTD",
          receivedAt: now,
          traceId: `t-ftd-${i}`,
        },
      });
    }
    await refreshDailyRollups({ from: dayStart(now), to: dayEnd(now) });

    const rows = await prisma.leadDailyRoll.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalReceived).toBe(3);
    expect(rows[0].totalFtd).toBe(3);
  });

  it("is idempotent across repeated runs", async () => {
    const { aff, bk } = await seedAffAndBroker();
    const now = new Date("2026-06-15T14:00:00.000Z");
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: bk.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: now,
        state: "ACCEPTED",
        receivedAt: now,
        traceId: "t-acc-1",
      },
    });
    await refreshDailyRollups({ from: dayStart(now), to: dayEnd(now) });
    await refreshDailyRollups({ from: dayStart(now), to: dayEnd(now) });

    const rows = await prisma.leadDailyRoll.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalAccepted).toBe(1);
  });

  it("uses sentinel brokerId when broker is null", async () => {
    const { aff } = await seedAffAndBroker();
    const now = new Date("2026-06-15T14:00:00.000Z");
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: null,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: now,
        state: "REJECTED",
        receivedAt: now,
        traceId: "t-rej-1",
      },
    });
    await refreshDailyRollups({ from: dayStart(now), to: dayEnd(now) });

    const rows = await prisma.leadDailyRoll.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].brokerId).toBe("__none__");
    expect(rows[0].totalRejected).toBe(1);
  });

  it("buckets daily rollups by canonicalStatus", async () => {
    const { aff, bk } = await seedAffAndBroker();
    const now = new Date("2026-06-15T14:00:00.000Z");
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: bk.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: now,
        state: "FTD",
        receivedAt: now,
        traceId: "t-cs-1",
        canonicalStatus: "ftd",
      },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: bk.id,
        geo: "US",
        ip: "1.1.1.2",
        eventTs: now,
        state: "ACCEPTED",
        receivedAt: now,
        traceId: "t-cs-2",
        canonicalStatus: "accepted",
      },
    });
    await refreshDailyRollups({ from: dayStart(now), to: dayEnd(now) });

    const rows = await prisma.leadDailyRoll.findMany({ orderBy: { canonicalStatus: "asc" } });
    expect(rows).toHaveLength(2);
    const byCs = new Map(rows.map((r) => [r.canonicalStatus, r]));
    expect(byCs.get("accepted")?.totalAccepted).toBe(1);
    expect(byCs.get("ftd")?.totalFtd).toBe(1);
  });

  it("buckets hourly rollups correctly", async () => {
    const { aff, bk } = await seedAffAndBroker();
    const at = new Date("2026-06-15T10:23:00.000Z");
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: bk.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: at,
        state: "PUSHED",
        receivedAt: at,
        traceId: "t-push-1",
      },
    });
    const from = new Date("2026-06-15T10:00:00.000Z");
    const to = new Date("2026-06-15T11:00:00.000Z");
    await refreshHourlyRollups({ from, to });

    const rows = await prisma.leadHourlyRoll.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].hour.toISOString()).toBe("2026-06-15T10:00:00.000Z");
    expect(rows[0].totalPushed).toBe(1);
  });
});
