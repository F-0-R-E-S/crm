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
  const ctx = {
    session: { user: { id: user.id, role } },
    prisma,
    userId: user.id,
    role,
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
  return { ctx, userId: user.id };
}

async function seedBroker() {
  return prisma.broker.create({
    data: {
      name: "t",
      endpointUrl: "https://t.test",
      fieldMapping: { firstName: "first_name" },
      postbackSecret: "s",
      postbackLeadIdPath: "lead_id",
      postbackStatusPath: "status",
      isActive: true,
      dailyCap: 100,
    },
  });
}

describe("scheduledChange router", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("create → list → cancel pipeline", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const b = await seedBroker();

    const created = await caller.scheduledChange.create({
      entityType: "Broker",
      entityId: b.id,
      payload: { isActive: false },
      applyAt: new Date(Date.now() + 3_600_000),
    });
    expect(created.status).toBe("PENDING");

    const all = await caller.scheduledChange.list({});
    expect(all.length).toBe(1);

    const cancelled = await caller.scheduledChange.cancel({ id: created.id });
    expect(cancelled.status).toBe("CANCELLED");

    await expect(caller.scheduledChange.cancel({ id: created.id })).rejects.toThrow(/only PENDING/);
  });

  it("create rejects disallowed field with BAD_REQUEST", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const b = await seedBroker();

    await expect(
      caller.scheduledChange.create({
        entityType: "Broker",
        entityId: b.id,
        payload: { endpointUrl: "https://evil" },
        applyAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow(/disallowed/);
  });

  it("applyNow mutates entity and transitions to APPLIED", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const b = await seedBroker();

    const sc = await caller.scheduledChange.create({
      entityType: "Broker",
      entityId: b.id,
      payload: { dailyCap: 42 },
      applyAt: new Date(Date.now() + 3_600_000),
    });

    const res = await caller.scheduledChange.applyNow({ id: sc.id });
    expect(res.status).toBe("APPLIED");
    const after = await prisma.broker.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.dailyCap).toBe(42);
  });

  it("retry transitions FAILED → PENDING", async () => {
    const { ctx, userId } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const b = await seedBroker();

    const sc = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: b.id,
        payload: { dailyCap: 10 },
        applyAt: new Date(),
        createdBy: userId,
        status: "FAILED",
        errorMessage: "previous failure",
      },
    });
    const r = await caller.scheduledChange.retry({ id: sc.id });
    expect(r.status).toBe("PENDING");
    expect(r.errorMessage).toBeNull();
  });

  it("OPERATOR is forbidden on all mutations", async () => {
    const { ctx } = await makeCtx("OPERATOR");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.scheduledChange.list({})).rejects.toThrow();
  });

  it("filters: status + entityType + applyAt range", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const b = await seedBroker();
    const now = Date.now();
    await caller.scheduledChange.create({
      entityType: "Broker",
      entityId: b.id,
      payload: { isActive: false },
      applyAt: new Date(now + 3_600_000),
    });
    const sc2 = await caller.scheduledChange.create({
      entityType: "Broker",
      entityId: b.id,
      payload: { dailyCap: 7 },
      applyAt: new Date(now + 7_200_000),
    });

    const inRange = await caller.scheduledChange.list({
      fromApplyAt: new Date(now + 5_000_000),
      toApplyAt: new Date(now + 10_000_000),
    });
    expect(inRange.map((r) => r.id)).toEqual([sc2.id]);

    const byEntity = await caller.scheduledChange.list({ entityType: "Broker" });
    expect(byEntity.length).toBe(2);

    const byStatus = await caller.scheduledChange.list({ status: "PENDING" });
    expect(byStatus.length).toBe(2);
  });
});
