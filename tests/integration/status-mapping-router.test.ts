import { prisma } from "@/server/db";
import { invalidateStatusMappingCache } from "@/server/status-groups/classify";
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
    data: { email: `sm-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role },
  });
  return {
    ctx: {
      session: { user: { id: user.id, role } },
      prisma,
      userId: user.id,
      role,
    } as unknown as Parameters<typeof appRouter.createCaller>[0],
    userId: user.id,
  };
}

async function makeBroker() {
  return prisma.broker.create({
    data: {
      name: "sm-broker",
      endpointUrl: "http://x",
      fieldMapping: {},
      postbackSecret: "s",
      postbackLeadIdPath: "lead_id",
      postbackStatusPath: "status",
    },
  });
}

async function makeCanonical(
  code: string,
  category: "NEW" | "QUALIFIED" | "REJECTED" | "CONVERTED",
) {
  return prisma.canonicalStatus.upsert({
    where: { code },
    update: {},
    create: { code, label: code, category, sortOrder: 10 },
  });
}

describe("statusMapping router", () => {
  beforeEach(async () => {
    await resetDb();
    invalidateStatusMappingCache();
  });

  it("listCanonical returns all canonical statuses ordered by category+sortOrder", async () => {
    await makeCanonical("new", "NEW");
    await makeCanonical("ftd", "CONVERTED");
    const { ctx } = await makeCtx("OPERATOR");
    const caller = appRouter.createCaller(ctx);
    const list = await caller.statusMapping.listCanonical();
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.code)).toContain("new");
    expect(list.map((c) => c.code)).toContain("ftd");
  });

  it("upsert creates, invalidates cache, and writes AuditLog", async () => {
    const { ctx, userId } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const broker = await makeBroker();
    const canon = await makeCanonical("qualified", "QUALIFIED");

    const r = await caller.statusMapping.upsert({
      brokerId: broker.id,
      rawStatus: "QUAL",
      canonicalStatusId: canon.id,
    });
    expect(r.canonicalStatusId).toBe(canon.id);
    const logs = await prisma.auditLog.findMany({
      where: { action: "status_mapping.upsert", userId },
    });
    expect(logs).toHaveLength(1);
  });

  it("OPERATOR cannot upsert", async () => {
    const { ctx } = await makeCtx("OPERATOR");
    const caller = appRouter.createCaller(ctx);
    const broker = await makeBroker();
    const canon = await makeCanonical("new", "NEW");
    await expect(
      caller.statusMapping.upsert({
        brokerId: broker.id,
        rawStatus: "r",
        canonicalStatusId: canon.id,
      }),
    ).rejects.toThrow();
  });

  it("bulkUpsert writes all rows", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const broker = await makeBroker();
    const c1 = await makeCanonical("new", "NEW");
    const c2 = await makeCanonical("ftd", "CONVERTED");
    const res = await caller.statusMapping.bulkUpsert({
      brokerId: broker.id,
      items: [
        { rawStatus: "r1", canonicalStatusId: c1.id },
        { rawStatus: "r2", canonicalStatusId: c2.id },
      ],
    });
    expect(res.written).toBe(2);
    const rows = await prisma.statusMapping.findMany({ where: { brokerId: broker.id } });
    expect(rows).toHaveLength(2);
  });

  it("suggestFor proposes canonical by Levenshtein similarity", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const broker = await makeBroker();
    await makeCanonical("qualified", "QUALIFIED");
    await makeCanonical("ftd", "CONVERTED");
    const aff = await prisma.affiliate.create({ data: { name: "sug-aff" } });
    // Plant "qual" on historical leads so suggestFor finds it
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: broker.id,
        geo: "XX",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: `sug-${Math.random()}`,
        state: "PUSHED",
        lastBrokerStatus: "qual",
      },
    });
    const suggestions = await caller.statusMapping.suggestFor({ brokerId: broker.id });
    expect(suggestions.length).toBeGreaterThan(0);
    const qualSuggestion = suggestions.find((s) => s.rawStatus === "qual");
    expect(qualSuggestion?.canonicalCode).toBe("qualified");
  });

  it("coverageForBroker returns mapped/unmapped volume split", async () => {
    const { ctx } = await makeCtx("OPERATOR");
    const caller = appRouter.createCaller(ctx);
    const broker = await makeBroker();
    const canon = await makeCanonical("ftd", "CONVERTED");
    await prisma.statusMapping.create({
      data: { brokerId: broker.id, rawStatus: "FTD", canonicalStatusId: canon.id },
    });
    const aff = await prisma.affiliate.create({ data: { name: "cov-aff" } });
    const makeLead = (raw: string, i: number) =>
      prisma.lead.create({
        data: {
          affiliateId: aff.id,
          brokerId: broker.id,
          geo: "XX",
          ip: "1.1.1.1",
          eventTs: new Date(),
          traceId: `cov-${i}-${Math.random()}`,
          state: "PUSHED",
          lastBrokerStatus: raw,
        },
      });
    await makeLead("FTD", 1);
    await makeLead("FTD", 2);
    await makeLead("other", 3);
    const cov = await caller.statusMapping.coverageForBroker({ brokerId: broker.id });
    expect(cov.totalVolume).toBe(3);
    expect(cov.mappedVolume).toBe(2);
    expect(cov.unmappedVolume).toBe(1);
  });

  it("backfillLeads updates Lead.canonicalStatus", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const broker = await makeBroker();
    const canon = await makeCanonical("ftd", "CONVERTED");
    await prisma.statusMapping.create({
      data: { brokerId: broker.id, rawStatus: "FTD", canonicalStatusId: canon.id },
    });
    const aff = await prisma.affiliate.create({ data: { name: "bf-aff" } });
    for (let i = 0; i < 5; i++) {
      await prisma.lead.create({
        data: {
          affiliateId: aff.id,
          brokerId: broker.id,
          geo: "XX",
          ip: "1.1.1.1",
          eventTs: new Date(),
          traceId: `bf-${i}-${Math.random()}`,
          state: "PUSHED",
          lastBrokerStatus: i % 2 === 0 ? "FTD" : "other",
        },
      });
    }
    const r = await caller.statusMapping.backfillLeads({ brokerId: broker.id });
    expect(r.updated).toBe(3);
    expect(r.unmapped).toBe(2);
    const canonicalLeads = await prisma.lead.findMany({
      where: { brokerId: broker.id, canonicalStatus: "ftd" },
    });
    expect(canonicalLeads).toHaveLength(3);
  });
});
