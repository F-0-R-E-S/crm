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
    data: { email: `pp-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role: "ADMIN" },
  });
  return {
    session: { user: { id: user.id, role: "ADMIN" } },
    prisma,
    userId: user.id,
    role: "ADMIN",
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

describe("analytics preset polish — rename / setDefault / getDefault", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("renames a preset", async () => {
    const c = await makeCtx();
    const caller = appRouter.createCaller(c);
    const created = await caller.analytics.savePreset({
      name: "first-name",
      query: { foo: "bar" },
    });
    await caller.analytics.renamePreset({ id: created.id, name: "new-name" });
    const list = await caller.analytics.listPresets();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("new-name");
  });

  it("rejects rename if the new name collides", async () => {
    const c = await makeCtx();
    const caller = appRouter.createCaller(c);
    const a = await caller.analytics.savePreset({ name: "a", query: {} });
    await caller.analytics.savePreset({ name: "b", query: {} });
    await expect(caller.analytics.renamePreset({ id: a.id, name: "b" })).rejects.toThrow();
  });

  it("setDefault marks one preset default and clears the previous", async () => {
    const c = await makeCtx();
    const caller = appRouter.createCaller(c);
    const a = await caller.analytics.savePreset({ name: "a", query: {} });
    const b = await caller.analytics.savePreset({ name: "b", query: {} });
    await caller.analytics.setDefaultPreset({ id: a.id });
    let defaults = (await caller.analytics.listPresets()).filter((p) => p.isDefault);
    expect(defaults.map((p) => p.id)).toEqual([a.id]);
    await caller.analytics.setDefaultPreset({ id: b.id });
    defaults = (await caller.analytics.listPresets()).filter((p) => p.isDefault);
    expect(defaults.map((p) => p.id)).toEqual([b.id]);
  });

  it("getDefaultPreset returns the current default or null", async () => {
    const c = await makeCtx();
    const caller = appRouter.createCaller(c);
    expect(await caller.analytics.getDefaultPreset()).toBeNull();
    const a = await caller.analytics.savePreset({ name: "a", query: { x: 1 } });
    await caller.analytics.setDefaultPreset({ id: a.id });
    const d = await caller.analytics.getDefaultPreset();
    expect(d?.id).toBe(a.id);
  });

  it("setDefault with id=null clears any current default", async () => {
    const c = await makeCtx();
    const caller = appRouter.createCaller(c);
    const a = await caller.analytics.savePreset({ name: "a", query: {} });
    await caller.analytics.setDefaultPreset({ id: a.id });
    await caller.analytics.setDefaultPreset({ id: null });
    const row = await caller.analytics.getDefaultPreset();
    expect(row).toBeNull();
  });

  it("isolates defaults per user", async () => {
    const c1 = await makeCtx();
    const c2 = await makeCtx();
    const cal1 = appRouter.createCaller(c1);
    const cal2 = appRouter.createCaller(c2);
    const a = await cal1.analytics.savePreset({ name: "a", query: {} });
    await cal1.analytics.setDefaultPreset({ id: a.id });
    // user 2 must not see user 1's default
    expect(await cal2.analytics.getDefaultPreset()).toBeNull();
  });
});
