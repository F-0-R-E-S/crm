import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../helpers/db";
import { seedAffiliate, seedLead } from "../../helpers/seed";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { appRouter } = await import("@/server/routers/_app");

async function mkCtx() {
  const user = await prisma.user.create({
    data: { email: `dd-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role: "ADMIN" },
  });
  return {
    session: { user: { id: user.id, role: "ADMIN" } },
    prisma,
    userId: user.id,
    role: "ADMIN",
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

const baseFilters = { affiliateIds: [], brokerIds: [], geos: [] };

describe("analytics.drillDown — filter-translation integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("filters by bucket for metric=leads (day group)", async () => {
    const c = await mkCtx();
    const caller = appRouter.createCaller(c);
    const aff = await seedAffiliate();
    // In-bucket: June 3
    await seedLead({
      affiliateId: aff.id,
      externalLeadId: "in-bucket",
      geo: "GB",
      state: "NEW",
      createdAt: new Date("2026-06-03T12:00:00Z"),
    });
    // Out-of-bucket: June 1
    await seedLead({
      affiliateId: aff.id,
      externalLeadId: "out-bucket",
      geo: "GB",
      state: "NEW",
      createdAt: new Date("2026-06-01T12:00:00Z"),
    });
    const res = await caller.analytics.drillDown({
      kind: "metric",
      metric: "leads",
      bucket: "2026-06-03T00:00:00Z",
      groupBy: "day",
      from: new Date("2026-06-01T00:00:00Z"),
      to: new Date("2026-06-10T00:00:00Z"),
      filters: baseFilters,
    });
    expect(res.items.length).toBe(1);
    expect(res.items[0].externalId).toBe("in-bucket");
  });

  it("filters by reject reason", async () => {
    const c = await mkCtx();
    const caller = appRouter.createCaller(c);
    const aff = await seedAffiliate();
    await seedLead({
      affiliateId: aff.id,
      externalLeadId: "rej",
      state: "REJECTED",
      rejectReason: "blacklist",
      createdAt: new Date("2026-06-03T12:00:00Z"),
    });
    await seedLead({
      affiliateId: aff.id,
      externalLeadId: "rej2",
      state: "REJECTED",
      rejectReason: "duplicate",
      createdAt: new Date("2026-06-03T12:00:00Z"),
    });
    const res = await caller.analytics.drillDown({
      kind: "reject",
      reason: "blacklist",
      from: new Date("2026-06-01T00:00:00Z"),
      to: new Date("2026-06-10T00:00:00Z"),
      filters: baseFilters,
    });
    expect(res.items.length).toBe(1);
    expect(res.items[0].rejectReason).toBe("blacklist");
  });

  it("filters by conversion stage 'accepted'", async () => {
    const c = await mkCtx();
    const caller = appRouter.createCaller(c);
    const aff = await seedAffiliate();
    await seedLead({
      affiliateId: aff.id,
      externalLeadId: "acc",
      state: "ACCEPTED",
      createdAt: new Date("2026-06-03T12:00:00Z"),
    });
    await seedLead({
      affiliateId: aff.id,
      externalLeadId: "ftd",
      state: "FTD",
      createdAt: new Date("2026-06-03T12:00:00Z"),
    });
    const res = await caller.analytics.drillDown({
      kind: "conversion",
      stage: "accepted",
      from: new Date("2026-06-01T00:00:00Z"),
      to: new Date("2026-06-10T00:00:00Z"),
      filters: baseFilters,
    });
    expect(res.items.map((l) => l.externalId).sort()).toEqual(["acc"]);
  });

  it("returns empty list when no match", async () => {
    const c = await mkCtx();
    const caller = appRouter.createCaller(c);
    const res = await caller.analytics.drillDown({
      kind: "metric",
      metric: "leads",
      bucket: "2026-06-03T00:00:00Z",
      groupBy: "day",
      from: new Date("2026-06-01T00:00:00Z"),
      to: new Date("2026-06-10T00:00:00Z"),
      filters: baseFilters,
    });
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });
});
