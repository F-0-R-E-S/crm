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
      name: "Src",
      endpointUrl: "https://src.example.com",
      fieldMapping: { firstName: "first_name" },
      postbackSecret: "ps",
      postbackLeadIdPath: "lead_id",
      postbackStatusPath: "status",
      authType: "BEARER",
      authConfig: { token: "abc" },
    },
  });
}

describe("broker.clone router mutation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("ADMIN can clone a broker; AuditLog emitted", async () => {
    const { ctx, userId } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const src = await seedBroker();

    const clone = await caller.broker.clone({ sourceId: src.id, newName: "Src (clone)" });
    expect(clone.clonedFromId).toBe(src.id);
    expect(clone.endpointUrl).toBe("");

    const logs = await prisma.auditLog.findMany({
      where: { action: "broker.clone", entityId: clone.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe(userId);
    expect(logs[0].entity).toBe("Broker");
    const diff = logs[0].diff as { sourceId?: string; newName?: string };
    expect(diff.sourceId).toBe(src.id);
    expect(diff.newName).toBe("Src (clone)");
  });

  it("OPERATOR cannot clone (admin-only)", async () => {
    const { ctx } = await makeCtx("OPERATOR");
    const caller = appRouter.createCaller(ctx);
    const src = await seedBroker();
    await expect(caller.broker.clone({ sourceId: src.id, newName: "nope" })).rejects.toThrow();
  });

  it("broker.listClones returns reverse list", async () => {
    const { ctx } = await makeCtx("ADMIN");
    const caller = appRouter.createCaller(ctx);
    const src = await seedBroker();
    const c1 = await caller.broker.clone({ sourceId: src.id, newName: "c1" });
    const c2 = await caller.broker.clone({ sourceId: src.id, newName: "c2" });

    const clones = await caller.broker.listClones({ sourceId: src.id });
    expect(clones.map((c) => c.id).sort()).toEqual([c1.id, c2.id].sort());
  });
});
