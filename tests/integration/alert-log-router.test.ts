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

describe("alertLog router", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("list: filters by ack state and ruleKey, orders by triggeredAt desc", async () => {
    const c = await makeCtx("ADMIN");
    const now = Date.now();
    await prisma.alertLog.createMany({
      data: [
        {
          ruleKey: "intake_error_rate",
          severity: "warning",
          message: "m1",
          triggeredAt: new Date(now - 3000),
          ackedAt: new Date(now - 1000),
          ackedBy: "u1",
        },
        {
          ruleKey: "intake_error_rate",
          severity: "critical",
          message: "m2",
          triggeredAt: new Date(now - 2000),
        },
        {
          ruleKey: "push_fail_rate",
          severity: "warning",
          message: "m3",
          triggeredAt: new Date(now - 1000),
        },
      ],
    });

    const caller = appRouter.createCaller(c);

    const all = await caller.alertLog.list({ page: 1, ack: "all" });
    expect(all.total).toBe(3);
    // desc order by triggeredAt
    expect(all.items[0].ruleKey).toBe("push_fail_rate");

    const unacked = await caller.alertLog.list({ page: 1, ack: "unacked" });
    expect(unacked.total).toBe(2);
    expect(unacked.items.every((r) => r.ackedAt === null)).toBe(true);

    const byRule = await caller.alertLog.list({
      page: 1,
      ack: "all",
      ruleKey: "intake_error_rate",
    });
    expect(byRule.total).toBe(2);
    expect(byRule.items.every((r) => r.ruleKey === "intake_error_rate")).toBe(true);
  });

  it("ack: sets ackedAt + ackedBy (from ctx.userId) and is idempotent; non-ADMIN blocked", async () => {
    const admin = await makeCtx("ADMIN");
    const alert = await prisma.alertLog.create({
      data: { ruleKey: "r1", severity: "warning", message: "m" },
    });

    const caller = appRouter.createCaller(admin);
    const acked = await caller.alertLog.ack({ id: alert.id });
    expect(acked.ackedAt).not.toBeNull();
    expect(acked.ackedBy).toBe((admin as unknown as { userId: string }).userId);

    // idempotent — a second ack does not overwrite the original ackedBy
    const second = await caller.alertLog.ack({ id: alert.id });
    expect(second.ackedBy).toBe(acked.ackedBy);
    expect(second.ackedAt?.getTime()).toBe(acked.ackedAt?.getTime());

    // Operator cannot ack
    const operator = await makeCtx("OPERATOR");
    const opCaller = appRouter.createCaller(operator);
    const alert2 = await prisma.alertLog.create({
      data: { ruleKey: "r2", severity: "warning", message: "m" },
    });
    await expect(opCaller.alertLog.ack({ id: alert2.id })).rejects.toThrow();
  });
});
