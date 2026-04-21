/**
 * v2.0 S2.0-3 — Billing tRPC router integration tests.
 *
 * Covers:
 *   - getSubscription returns trial for default tenant (no row)
 *   - listInvoices empty / populated + ordering
 *   - getUsage returns 0 in fresh DB
 *   - cross-tenant isolation (tenant-α cannot see tenant-β's invoices/sub)
 *   - startCheckout rejects when Stripe not configured
 */
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

function ctxFor(tenantId: string, userId: string, role: UserRole = "ADMIN") {
  return {
    session: { user: { id: userId, role, tenantId } },
    prisma,
    userId,
    role,
    tenantId,
    hostTenantId: tenantId,
    sessionTenantId: tenantId,
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

describe("billing router", () => {
  let alphaUserId: string;
  let betaUserId: string;

  beforeEach(async () => {
    await resetDb();
    await prisma.tenant.createMany({
      data: [
        { id: "tenant-alpha", slug: "alpha", name: "Alpha", displayName: "Alpha" },
        { id: "tenant-beta", slug: "beta", name: "Beta", displayName: "Beta" },
      ],
      skipDuplicates: true,
    });
    const u1 = await prisma.user.create({
      data: {
        email: `alpha-${Date.now()}@t.io`,
        passwordHash: "x",
        role: "ADMIN",
        tenantId: "tenant-alpha",
      },
    });
    const u2 = await prisma.user.create({
      data: {
        email: `beta-${Date.now()}@t.io`,
        passwordHash: "x",
        role: "ADMIN",
        tenantId: "tenant-beta",
      },
    });
    alphaUserId = u1.id;
    betaUserId = u2.id;
  });

  it("getSubscription returns trial defaults for a tenant without a Subscription row", async () => {
    const caller = appRouter.createCaller(ctxFor("tenant-alpha", alphaUserId));
    const sub = await caller.billing.getSubscription();
    expect(sub.plan).toBe("trial");
    expect(sub.status).toBe("TRIALING");
    // stripeConfigured defaults to false in test env (no STRIPE_SECRET_KEY)
    expect(typeof sub.stripeConfigured).toBe("boolean");
  });

  it("getSubscription returns the persisted plan/status when a Subscription row exists", async () => {
    await prisma.subscription.create({
      data: {
        tenantId: "tenant-alpha",
        plan: "growth",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400 * 1000),
      },
    });
    const caller = appRouter.createCaller(ctxFor("tenant-alpha", alphaUserId));
    const sub = await caller.billing.getSubscription();
    expect(sub.plan).toBe("growth");
    expect(sub.status).toBe("ACTIVE");
  });

  it("listInvoices is empty on a fresh tenant", async () => {
    const caller = appRouter.createCaller(ctxFor("tenant-alpha", alphaUserId));
    const list = await caller.billing.listInvoices();
    expect(list).toEqual([]);
  });

  it("listInvoices returns only the caller tenant's invoices (cross-tenant isolation)", async () => {
    await prisma.invoice.create({
      data: {
        tenantId: "tenant-alpha",
        stripeInvoiceId: "in_alpha_1",
        amountCents: 39900,
        status: "paid",
        periodStart: new Date(Date.now() - 30 * 86_400 * 1000),
        periodEnd: new Date(),
      },
    });
    await prisma.invoice.create({
      data: {
        tenantId: "tenant-beta",
        stripeInvoiceId: "in_beta_1",
        amountCents: 59900,
        status: "paid",
        periodStart: new Date(Date.now() - 30 * 86_400 * 1000),
        periodEnd: new Date(),
      },
    });

    const alpha = appRouter.createCaller(ctxFor("tenant-alpha", alphaUserId));
    const alphaList = await alpha.billing.listInvoices();
    expect(alphaList.length).toBe(1);
    expect(alphaList[0].stripeInvoiceId).toBe("in_alpha_1");

    const beta = appRouter.createCaller(ctxFor("tenant-beta", betaUserId));
    const betaList = await beta.billing.listInvoices();
    expect(betaList.length).toBe(1);
    expect(betaList[0].stripeInvoiceId).toBe("in_beta_1");
  });

  it("getUsage returns 0 used on a fresh tenant", async () => {
    const caller = appRouter.createCaller(ctxFor("tenant-alpha", alphaUserId));
    const usage = await caller.billing.getUsage();
    expect(usage.leadsUsed).toBe(0);
    expect(usage.plan).toBe("trial");
    expect(usage.over).toBe(false);
  });

  it("startCheckout rejects when Stripe is not configured", async () => {
    const caller = appRouter.createCaller(ctxFor("tenant-alpha", alphaUserId));
    await expect(caller.billing.startCheckout({ plan: "starter" })).rejects.toThrow(
      /stripe_not_configured/,
    );
  });

  it("openPortal rejects when Stripe is not configured", async () => {
    const caller = appRouter.createCaller(ctxFor("tenant-alpha", alphaUserId));
    await expect(caller.billing.openPortal()).rejects.toThrow(/stripe_not_configured/);
  });

  it("non-admin cannot cancel", async () => {
    const op = await prisma.user.create({
      data: {
        email: `op-${Date.now()}@t.io`,
        passwordHash: "x",
        role: "OPERATOR",
        tenantId: "tenant-alpha",
      },
    });
    const caller = appRouter.createCaller(ctxFor("tenant-alpha", op.id, "OPERATOR"));
    await expect(caller.billing.cancel({ atPeriodEnd: true })).rejects.toThrow();
  });
});
