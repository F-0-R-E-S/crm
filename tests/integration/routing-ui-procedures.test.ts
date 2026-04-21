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
    data: { email: `u-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role },
  });
  return {
    session: { user: { id: user.id, role } },
    prisma,
    userId: user.id,
    role,
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

// Minimal publishable graph — mirrors the fixture in routing-flow-crud.
const graph = {
  nodes: [
    { id: "e", kind: "Entry" as const },
    { id: "a", kind: "Algorithm" as const, mode: "WEIGHTED_ROUND_ROBIN" as const },
    { id: "t", kind: "BrokerTarget" as const, brokerId: "brk-ui-test", weight: 100 },
    { id: "x", kind: "Exit" as const },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" as const },
    { from: "a", to: "t", condition: "default" as const },
    { from: "t", to: "x", condition: "default" as const },
  ],
};

describe("routing UI tRPC procedures", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("listBrokersForFlow — returns broker summary without secrets", async () => {
    const c = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(c);

    const broker = await prisma.broker.create({
      data: {
        name: "UI Broker",
        endpointUrl: "https://example.com/push",
        fieldMapping: {},
        postbackSecret: "secret",
        postbackLeadIdPath: "$.id",
        postbackStatusPath: "$.status",
        lastHealthStatus: "healthy",
        autologinEnabled: true,
        dailyCap: 1000,
      },
    });

    const rows = await caller.routing.listBrokersForFlow();
    const match = rows.find((r) => r.id === broker.id);
    expect(match).toBeDefined();
    expect(match?.name).toBe("UI Broker");
    expect(match?.lastHealthStatus).toBe("healthy");
    expect(match?.autologinEnabled).toBe(true);
    expect(match?.dailyCap).toBe(1000);
    // Secrets must not leak:
    expect(match as Record<string, unknown>).not.toHaveProperty("fieldMapping");
    expect(match as Record<string, unknown>).not.toHaveProperty("endpointUrl");
    expect(match as Record<string, unknown>).not.toHaveProperty("postbackSecret");
  });

  it("listAlgoConfigs / upsertAlgoConfig — round-trip flow-scope WRR", async () => {
    const c = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(c);

    const flow = await caller.routing.create({ name: "F1", timezone: "UTC", graph });

    // Empty before upsert.
    const before = await caller.routing.listAlgoConfigs({ flowId: flow.id });
    expect(before).toHaveLength(0);

    await caller.routing.upsertAlgoConfig({
      flowId: flow.id,
      scope: "FLOW",
      mode: "WEIGHTED_ROUND_ROBIN",
      params: { weights: { t: 70 } },
    });

    const after = await caller.routing.listAlgoConfigs({ flowId: flow.id });
    expect(after).toHaveLength(1);
    expect(after[0].mode).toBe("WEIGHTED_ROUND_ROBIN");
    expect((after[0].params as { weights: Record<string, number> }).weights.t).toBe(70);

    // Update in place — still a single row.
    await caller.routing.upsertAlgoConfig({
      flowId: flow.id,
      scope: "FLOW",
      mode: "WEIGHTED_ROUND_ROBIN",
      params: { weights: { t: 100 } },
    });
    const after2 = await caller.routing.listAlgoConfigs({ flowId: flow.id });
    expect(after2).toHaveLength(1);
    expect((after2[0].params as { weights: Record<string, number> }).weights.t).toBe(100);
  });

  it("upsertAlgoConfig — Slots-Chance sum must equal 100", async () => {
    const c = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(c);
    const flow = await caller.routing.create({ name: "F2", timezone: "UTC", graph });

    await expect(
      caller.routing.upsertAlgoConfig({
        flowId: flow.id,
        scope: "FLOW",
        mode: "SLOTS_CHANCE",
        params: { chance: { t: 40 } }, // invalid — 40 != 100
      }),
    ).rejects.toThrow();

    // Valid sum goes through.
    await caller.routing.upsertAlgoConfig({
      flowId: flow.id,
      scope: "FLOW",
      mode: "SLOTS_CHANCE",
      params: { chance: { t: 100 } },
    });
    const after = await caller.routing.listAlgoConfigs({ flowId: flow.id });
    expect(after[0].mode).toBe("SLOTS_CHANCE");
  });

  it("upsertAlgoConfig — rejected on PUBLISHED flow; non-ADMIN blocked", async () => {
    const admin = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(admin);
    const flow = await caller.routing.create({ name: "F3", timezone: "UTC", graph });

    // The graph is publishable (no filter-style holes). Publish it.
    await caller.routing.publish({ id: flow.id });

    await expect(
      caller.routing.upsertAlgoConfig({
        flowId: flow.id,
        scope: "FLOW",
        mode: "WEIGHTED_ROUND_ROBIN",
        params: { weights: { t: 50 } },
      }),
    ).rejects.toThrow(/PUBLISHED/i);

    // Operator role can't call upsertAlgoConfig (admin-only procedure).
    const op = await makeCtx("OPERATOR");
    const opCaller = appRouter.createCaller(op);
    await expect(
      opCaller.routing.upsertAlgoConfig({
        flowId: flow.id,
        scope: "FLOW",
        mode: "WEIGHTED_ROUND_ROBIN",
        params: { weights: { t: 10 } },
      }),
    ).rejects.toThrow();
  });

  it("overview — aggregates totals, geoStats, flows + works on empty DB", async () => {
    const c = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(c);

    // Empty state first
    const empty = await caller.routing.overview();
    expect(empty.flows).toEqual([]);
    expect(empty.totals.received).toBe(0);
    expect(empty.geoStats).toEqual([]);
    expect(empty.topCapBlocked).toEqual([]);

    // Seed a flow + one lead.
    await caller.routing.create({ name: "FO", timezone: "UTC", graph });
    const aff = await prisma.affiliate.create({
      data: { name: "AffX" },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "UA",
        ip: "1.1.1.1",
        state: "PUSHED",
        eventTs: new Date(),
        traceId: `tr-${Math.random()}`,
      },
    });

    const stats = await caller.routing.overview();
    expect(stats.flows).toHaveLength(1);
    expect(stats.totals.received).toBe(1);
    expect(stats.totals.routed).toBe(1);
    expect(stats.geoStats.find((g) => g.geo === "UA")?.received).toBe(1);
  });
});
