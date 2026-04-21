/**
 * v2.0 S2.0-3 — Stripe webhook event dispatcher.
 *
 * Pure-handler function called from `src/app/api/stripe/webhook/route.ts`
 * after signature verification. Keeps DB writes + Telegram emits in one place
 * so the route stays thin and the dispatcher can be unit-tested.
 */
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { emitTelegramEvent } from "@/server/telegram/emit";
import type { Prisma, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";
import { type PlanTier, isPlanTier, planFromStripePriceId } from "./plans";

const HANDLED = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export function isHandledEvent(type: string): boolean {
  return HANDLED.has(type);
}

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
    case "incomplete_expired":
      return "INCOMPLETE";
    default:
      return "INCOMPLETE";
  }
}

function pickPlanFromSubscription(sub: Stripe.Subscription): PlanTier {
  const metaPlan = typeof sub.metadata?.plan === "string" ? sub.metadata.plan : null;
  if (metaPlan && isPlanTier(metaPlan)) return metaPlan;
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const fromPrice = planFromStripePriceId(priceId);
  if (fromPrice) return fromPrice;
  return "starter";
}

function resolveTenantId(obj: { metadata?: Stripe.Metadata | null }): string | null {
  const meta = obj.metadata ?? null;
  if (meta && typeof meta.tenantId === "string" && meta.tenantId.length > 0) {
    return meta.tenantId;
  }
  return null;
}

/** Turn a Unix timestamp (seconds) from Stripe into a JS Date. */
function fromUnix(ts: number | null | undefined): Date {
  if (!ts || !Number.isFinite(ts)) return new Date();
  return new Date(ts * 1000);
}

/**
 * In recent Stripe API versions the `current_period_{start,end}` fields moved
 * from `Subscription` onto the nested `SubscriptionItem`. Read from either
 * location to stay resilient across SDK upgrades.
 */
function subscriptionPeriod(sub: Stripe.Subscription): { start: Date; end: Date } {
  const subAny = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    items?: { data?: Array<{ current_period_start?: number; current_period_end?: number }> };
  };
  const item = subAny.items?.data?.[0];
  const startTs = subAny.current_period_start ?? item?.current_period_start ?? null;
  const endTs = subAny.current_period_end ?? item?.current_period_end ?? null;
  return { start: fromUnix(startTs), end: fromUnix(endTs) };
}

export interface HandleResult {
  ok: boolean;
  type: string;
  tenantId?: string;
  skipped?: true;
  reason?: string;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<HandleResult> {
  if (!isHandledEvent(event.type)) {
    return { ok: true, type: event.type, skipped: true, reason: "unhandled_event" };
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscriptionUpsert(event);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event);
    case "invoice.paid":
      return handleInvoicePaid(event);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event);
    default:
      return { ok: true, type: event.type, skipped: true, reason: "unreachable" };
  }
}

async function handleSubscriptionUpsert(event: Stripe.Event): Promise<HandleResult> {
  const sub = event.data.object as Stripe.Subscription;
  const tenantId =
    resolveTenantId(sub) ??
    (typeof sub.customer === "string"
      ? ((
          await prisma.subscription.findFirst({
            where: { stripeCustomerId: sub.customer },
            select: { tenantId: true },
          })
        )?.tenantId ?? null)
      : null);

  if (!tenantId) {
    logger.warn({ event: "stripe.webhook.skipped", reason: "no_tenant", type: event.type });
    return { ok: false, type: event.type, skipped: true, reason: "no_tenant" };
  }

  const plan = pickPlanFromSubscription(sub);
  const status = mapStripeStatus(sub.status);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  const period = subscriptionPeriod(sub);
  const data: Prisma.SubscriptionUncheckedCreateInput = {
    tenantId,
    stripeCustomerId: customerId ?? null,
    stripeSubscriptionId: sub.id,
    plan,
    status,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    trialEndsAt: sub.trial_end ? fromUnix(sub.trial_end) : null,
  };

  const existing = await prisma.subscription.findUnique({ where: { tenantId } });
  if (existing) {
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        plan: data.plan,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        trialEndsAt: data.trialEndsAt,
      },
    });
  } else {
    await prisma.subscription.create({ data });
  }

  const slug = await tenantSlug(tenantId);
  if (event.type === "customer.subscription.created") {
    await safeEmit("SUBSCRIPTION_CREATED", { tenantId, tenantSlug: slug, plan, status });
  } else if (existing && existing.currentPeriodEnd.getTime() < period.end.getTime()) {
    // period advanced → treat as renewal
    await safeEmit("SUBSCRIPTION_RENEWED", {
      tenantId,
      tenantSlug: slug,
      plan,
      currentPeriodEnd: period.end.toISOString(),
    });
  }

  return { ok: true, type: event.type, tenantId };
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<HandleResult> {
  const sub = event.data.object as Stripe.Subscription;
  const tenantId =
    resolveTenantId(sub) ??
    (typeof sub.customer === "string"
      ? ((
          await prisma.subscription.findFirst({
            where: { stripeCustomerId: sub.customer },
            select: { tenantId: true },
          })
        )?.tenantId ?? null)
      : null);
  if (!tenantId) return { ok: false, type: event.type, skipped: true, reason: "no_tenant" };

  const plan = pickPlanFromSubscription(sub);
  await prisma.subscription.update({
    where: { tenantId },
    data: {
      status: "CANCELED",
      cancelAtPeriodEnd: false,
    },
  });

  const slug = await tenantSlug(tenantId);
  await safeEmit("SUBSCRIPTION_CANCELED", {
    tenantId,
    tenantSlug: slug,
    plan,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  });
  return { ok: true, type: event.type, tenantId };
}

async function handleInvoicePaid(event: Stripe.Event): Promise<HandleResult> {
  return upsertInvoice(event, true);
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<HandleResult> {
  return upsertInvoice(event, false);
}

async function upsertInvoice(event: Stripe.Event, paid: boolean): Promise<HandleResult> {
  const inv = event.data.object as Stripe.Invoice;
  const tenantId =
    resolveTenantId(inv) ??
    (typeof inv.customer === "string"
      ? ((
          await prisma.subscription.findFirst({
            where: { stripeCustomerId: inv.customer },
            select: { tenantId: true },
          })
        )?.tenantId ?? null)
      : null);
  if (!tenantId) return { ok: false, type: event.type, skipped: true, reason: "no_tenant" };

  const amountCents = inv.amount_paid ?? inv.amount_due ?? 0;
  const currency = inv.currency ?? "usd";
  const periodStart = fromUnix(inv.period_start);
  const periodEnd = fromUnix(inv.period_end);
  const status = inv.status ?? (paid ? "paid" : "open");

  const existing = await prisma.invoice.findUnique({
    where: { stripeInvoiceId: inv.id ?? "" },
  });

  const data: Prisma.InvoiceUncheckedCreateInput = {
    tenantId,
    stripeInvoiceId: inv.id ?? `missing-${event.id}`,
    amountCents,
    currency,
    status,
    periodStart,
    periodEnd,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    pdfUrl: inv.invoice_pdf ?? null,
    paidAt: paid ? new Date() : null,
  };

  if (existing) {
    await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        amountCents,
        currency,
        status,
        periodStart,
        periodEnd,
        hostedInvoiceUrl: data.hostedInvoiceUrl,
        pdfUrl: data.pdfUrl,
        paidAt: paid ? (existing.paidAt ?? new Date()) : existing.paidAt,
      },
    });
  } else {
    await prisma.invoice.create({ data });
  }

  // If payment failed, flip subscription to PAST_DUE (Stripe sends a
  // `customer.subscription.updated` afterwards; this is just an eager guard).
  if (!paid) {
    await prisma.subscription.updateMany({
      where: { tenantId },
      data: { status: "PAST_DUE" },
    });
  }

  const slug = await tenantSlug(tenantId);
  await safeEmit(paid ? "INVOICE_PAID" : "INVOICE_FAILED", {
    tenantId,
    tenantSlug: slug,
    amountCents,
    currency,
    stripeInvoiceId: inv.id,
  });
  return { ok: true, type: event.type, tenantId };
}

async function tenantSlug(tenantId: string): Promise<string> {
  const row = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  return row?.slug ?? tenantId;
}

async function safeEmit(
  type: Parameters<typeof emitTelegramEvent>[0],
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await emitTelegramEvent(type, payload);
  } catch (err) {
    logger.warn({ event: "stripe.webhook.emit_failed", type, err: String(err) });
  }
}

// Expose env for the route handler without re-importing it at a different layer.
export { env };
