import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAdminSession, seedBroker } from "../helpers/seed";

// next-auth's import of "next/server" trips Node-env tests. Mock before appRouter import.
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { appRouter } = await import("@/server/routers/_app");

describe("finance tRPC router", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("pnl returns zero envelope when no conversions exist", async () => {
    const ctx = await seedAdminSession();
    const caller = appRouter.createCaller(ctx);
    const r = await caller.finance.pnl({
      from: new Date("2026-06-01"),
      to: new Date("2026-07-01"),
    });
    expect(r.conversionCount).toBe(0);
    expect(r.revenue).toBe("0");
    expect(r.payout).toBe("0");
    expect(r.marginPct).toBe(0);
  });

  it("upsertBrokerPayoutRule creates and then updates a rule", async () => {
    const ctx = await seedAdminSession();
    const broker = await seedBroker();
    const caller = appRouter.createCaller(ctx);
    const created = await caller.finance.upsertBrokerPayoutRule({
      brokerId: broker.id,
      kind: "CPA_FIXED",
      cpaAmount: "100",
      activeFrom: new Date("2026-01-01"),
    });
    expect(created.id).toBeTruthy();

    const updated = await caller.finance.upsertBrokerPayoutRule({
      id: created.id,
      brokerId: broker.id,
      kind: "CPA_FIXED",
      cpaAmount: "150",
      activeFrom: new Date("2026-01-01"),
    });
    expect(updated.cpaAmount?.toString()).toBe("150");
  });

  it("upsertAffiliatePayoutRule with nullable brokerId stores null scope", async () => {
    const ctx = await seedAdminSession();
    const aff = await prisma.affiliate.create({
      data: { name: "aff-scope", contactEmail: "scope@t.io" },
    });
    const caller = appRouter.createCaller(ctx);
    const created = await caller.finance.upsertAffiliatePayoutRule({
      affiliateId: aff.id,
      brokerId: null,
      kind: "CPA_FIXED",
      cpaAmount: "50",
      activeFrom: new Date("2026-01-01"),
    });
    expect(created.brokerId).toBeNull();
    expect(created.cpaAmount?.toString()).toBe("50");
  });
});
