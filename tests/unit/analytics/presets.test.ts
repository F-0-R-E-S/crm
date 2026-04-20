import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { appRouter } = await import("@/server/routers/_app");

async function makeCtx() {
  const user = await prisma.user.create({
    data: { email: `pt-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role: "ADMIN" },
  });
  return {
    session: { user: { id: user.id, role: "ADMIN" } },
    prisma,
    userId: user.id,
    role: "ADMIN",
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

describe("analytics preset CRUD", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates, lists, deletes a preset", async () => {
    const c = await makeCtx();
    const caller = appRouter.createCaller(c);
    const created = await caller.analytics.savePreset({
      name: "last-7-days",
      query: { from: "2026-06-01", to: "2026-06-07" },
    });
    expect(created.id).toBeDefined();
    const list1 = await caller.analytics.listPresets();
    expect(list1).toHaveLength(1);
    await caller.analytics.deletePreset({ id: created.id });
    const list2 = await caller.analytics.listPresets();
    expect(list2).toHaveLength(0);
  });

  it("rejects duplicate (userId, name)", async () => {
    const c = await makeCtx();
    const caller = appRouter.createCaller(c);
    await caller.analytics.savePreset({ name: "dup", query: {} });
    await expect(caller.analytics.savePreset({ name: "dup", query: {} })).rejects.toThrow();
  });
});
