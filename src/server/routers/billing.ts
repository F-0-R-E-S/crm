/**
 * v2.0 S2.0-3 — Billing tRPC router.
 *
 * Tenant-scoped read ops (`getSubscription`, `listInvoices`, `getUsage`) use
 * `protectedProcedure` — any signed-in user in the tenant can see their plan.
 * Mutations (`startCheckout`, `openPortal`, `cancel`, `reactivate`) require
 * `adminProcedure` — only tenant admins can manage billing.
 */
import { env } from "@/lib/env";
import {
  currentMonthWindow,
  getMonthlyLeadsUsed,
  resolveActivePlan,
} from "@/server/billing/plan-gates";
import { PLAN_LIMITS, isPlanTier } from "@/server/billing/plans";
import {
  cancelSubscription,
  createBillingPortalSession,
  createCheckoutSession,
  isStripeConfigured,
  reactivateSubscription,
} from "@/server/billing/stripe";
import { prisma } from "@/server/db";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const PlanInput = z.enum(["starter", "growth", "pro"]);

function requireStripe(): void {
  if (!isStripeConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "stripe_not_configured",
    });
  }
}

export const billingRouter = router({
  /** Any user can see their tenant's current plan and status. */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await prisma.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });
    if (!sub) {
      return {
        plan: "trial" as const,
        status: "TRIALING" as const,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        stripeConfigured: isStripeConfigured(),
        priceCents: PLAN_LIMITS.trial.priceCents,
        planLabel: PLAN_LIMITS.trial.label,
      };
    }
    const planKey = isPlanTier(sub.plan) ? sub.plan : "trial";
    return {
      plan: planKey,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      stripeConfigured: isStripeConfigured(),
      priceCents: PLAN_LIMITS[planKey].priceCents,
      planLabel: PLAN_LIMITS[planKey].label,
    };
  }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const { plan } = await resolveActivePlan(ctx.tenantId);
    const used = await getMonthlyLeadsUsed(ctx.tenantId);
    const limit = PLAN_LIMITS[plan].maxLeadsPerMonth;
    const { from, to } = currentMonthWindow();
    const pct = limit == null ? 0 : limit > 0 ? used / limit : Number.POSITIVE_INFINITY;
    return {
      plan,
      leadsUsed: used,
      leadsLimit: limit,
      pct,
      warn: limit != null && pct >= 0.9,
      over: limit != null && used >= limit,
      periodFrom: from,
      periodTo: to,
    };
  }),

  listInvoices: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).default({ limit: 25 }))
    .query(async ({ ctx, input }) => {
      const rows = await prisma.invoice.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
      return rows.map((r) => ({
        id: r.id,
        stripeInvoiceId: r.stripeInvoiceId,
        amountCents: r.amountCents,
        currency: r.currency,
        status: r.status,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        hostedInvoiceUrl: r.hostedInvoiceUrl,
        pdfUrl: r.pdfUrl,
        paidAt: r.paidAt,
        createdAt: r.createdAt,
      }));
    }),

  startCheckout: adminProcedure
    .input(z.object({ plan: PlanInput }))
    .mutation(async ({ ctx, input }) => {
      requireStripe();
      const base = env.STRIPE_BILLING_RETURN_URL?.replace(/\/$/, "") ?? "";
      const successUrl = `${base || ""}/dashboard/settings/billing?checkout=success`;
      const cancelUrl = `${base || ""}/dashboard/settings/billing?checkout=cancel`;
      const { url } = await createCheckoutSession({
        tenantId: ctx.tenantId,
        plan: input.plan,
        successUrl,
        cancelUrl,
      });
      return { url };
    }),

  openPortal: adminProcedure.mutation(async ({ ctx }) => {
    requireStripe();
    const base = env.STRIPE_BILLING_RETURN_URL?.replace(/\/$/, "") ?? "";
    const returnUrl = `${base || ""}/dashboard/settings/billing`;
    const { url } = await createBillingPortalSession({
      tenantId: ctx.tenantId,
      returnUrl,
    });
    return { url };
  }),

  cancel: adminProcedure
    .input(z.object({ atPeriodEnd: z.boolean().default(true) }).default({ atPeriodEnd: true }))
    .mutation(async ({ ctx, input }) => {
      requireStripe();
      await cancelSubscription(ctx.tenantId, input.atPeriodEnd);
      return { ok: true };
    }),

  reactivate: adminProcedure.mutation(async ({ ctx }) => {
    requireStripe();
    await reactivateSubscription(ctx.tenantId);
    return { ok: true };
  }),
});
