import { prisma } from "@/server/db";
import type { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { appRouter } = await import("@/server/routers/_app");

async function makeCtx(role: UserRole = "ADMIN") {
  const user = await prisma.user.create({
    data: { email: `an-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role },
  });
  return {
    session: { user: { id: user.id, role } },
    prisma,
    userId: user.id,
    role,
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

describe("analytics canonical-status drilldown + breakdown", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("drillDown(canonical-status) filters leads by Lead.canonicalStatus", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "a" } });
    const broker = await prisma.broker.create({
      data: {
        name: "b",
        endpointUrl: "http://x",
        fieldMapping: {},
        postbackSecret: "s",
        postbackLeadIdPath: "id",
        postbackStatusPath: "st",
      },
    });
    const now = new Date();
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: broker.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: now,
        traceId: `ftd-${Math.random()}`,
        state: "FTD",
        canonicalStatus: "ftd",
        lastBrokerStatus: "ftd",
        createdAt: now,
      },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: broker.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: now,
        traceId: `rej-${Math.random()}`,
        state: "REJECTED",
        canonicalStatus: "rejected",
        lastBrokerStatus: "rejected",
        createdAt: now,
      },
    });

    const ctx = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const from = new Date(now.getTime() - 86_400_000);
    const to = new Date(now.getTime() + 86_400_000);
    const res = await caller.analytics.drillDown({
      kind: "canonical-status",
      canonicalStatus: "ftd",
      from,
      to,
      filters: { affiliateIds: [], brokerIds: [], geos: [], canonicalStatuses: [] },
      page: 1,
      pageSize: 50,
    });
    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
  });

  it("canonicalStatusBreakdown returns counts grouped by canonicalStatus", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "a2" } });
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      await prisma.lead.create({
        data: {
          affiliateId: aff.id,
          geo: "US",
          ip: "1.1.1.1",
          eventTs: now,
          traceId: `f-${i}-${Math.random()}`,
          state: "FTD",
          canonicalStatus: "ftd",
          createdAt: now,
        },
      });
    }
    for (let i = 0; i < 2; i++) {
      await prisma.lead.create({
        data: {
          affiliateId: aff.id,
          geo: "US",
          ip: "1.1.1.1",
          eventTs: now,
          traceId: `r-${i}-${Math.random()}`,
          state: "REJECTED",
          canonicalStatus: "rejected",
          createdAt: now,
        },
      });
    }
    const ctx = await makeCtx("OPERATOR");
    const caller = appRouter.createCaller(ctx);
    const from = new Date(now.getTime() - 86_400_000);
    const to = new Date(now.getTime() + 86_400_000);
    const res = await caller.analytics.canonicalStatusBreakdown({
      from,
      to,
      groupBy: "day",
      filters: { affiliateIds: [], brokerIds: [], geos: [], canonicalStatuses: [] },
      compareTo: null,
      metric: "leads",
    });
    expect(res.total).toBe(5);
    const ftdRow = res.rows.find((r) => r.canonicalStatus === "ftd");
    expect(ftdRow?.count).toBe(3);
    const rejRow = res.rows.find((r) => r.canonicalStatus === "rejected");
    expect(rejRow?.count).toBe(2);
  });
});
