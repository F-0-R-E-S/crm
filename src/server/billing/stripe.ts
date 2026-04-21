/**
 * v2.0 S2.0-3 — Stripe service layer.
 *
 * Lazy singleton that initializes only if `STRIPE_SECRET_KEY` is set. Any
 * access in a no-Stripe environment throws an explicit error — callers should
 * first check `isStripeConfigured()` and gracefully degrade.
 */
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import Stripe from "stripe";
import { type PlanTier, stripePriceIdFor } from "./plans";

let _client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured (STRIPE_SECRET_KEY missing). Check isStripeConfigured() first.",
    );
  }
  if (!_client) {
    _client = new Stripe(env.STRIPE_SECRET_KEY, {
      // biome-ignore lint/suspicious/noExplicitAny: Stripe's apiVersion is a string literal union that shifts between SDK versions; cast once here so upstream bumps don't break the callsite.
      apiVersion: "2024-11-20.acacia" as any,
      typescript: true,
      appInfo: { name: "gambchamp-crm", version: "2.0.0-s3" },
    });
  }
  return _client;
}

/** Test-only hook — reset the memoized client so env edits can take effect. */
export function _resetStripeClientForTests(): void {
  _client = null;
}

/**
 * Upsert a Stripe Customer for the tenant. Looks up (or creates) by
 * `Subscription.stripeCustomerId`; caller must already have a Subscription
 * row (created in seed as a trial or by webhook). Returns the customer id.
 */
export async function createOrRetrieveCustomer(tenantId: string): Promise<string> {
  const stripe = getStripe();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, displayName: true, slug: true },
  });
  if (!tenant) throw new Error(`tenant not found: ${tenantId}`);

  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (sub?.stripeCustomerId) {
    // Sanity: make sure the customer still exists on Stripe's side.
    try {
      const existing = await stripe.customers.retrieve(sub.stripeCustomerId);
      if (!existing.deleted) return sub.stripeCustomerId;
    } catch {
      // fall through → create a new one.
    }
  }

  const created = await stripe.customers.create({
    name: tenant.displayName,
    metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
  });

  if (sub) {
    await prisma.subscription.update({
      where: { tenantId },
      data: { stripeCustomerId: created.id },
    });
  }
  return created.id;
}

export interface CheckoutOptions {
  tenantId: string;
  plan: PlanTier;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(opts: CheckoutOptions): Promise<{ url: string }> {
  const stripe = getStripe();
  const priceId = stripePriceIdFor(opts.plan);
  if (!priceId) {
    throw new Error(
      `Stripe price id not configured for plan '${opts.plan}'. Set STRIPE_PRICE_${opts.plan.toUpperCase()}.`,
    );
  }
  const customerId = await createOrRetrieveCustomer(opts.tenantId);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.tenantId,
    subscription_data: {
      metadata: { tenantId: opts.tenantId, plan: opts.plan },
    },
    metadata: { tenantId: opts.tenantId, plan: opts.plan },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

export async function createBillingPortalSession(opts: {
  tenantId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const customerId = await createOrRetrieveCustomer(opts.tenantId);
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: opts.returnUrl,
  });
  return { url: portal.url };
}

export async function cancelSubscription(tenantId: string, atPeriodEnd = true): Promise<void> {
  const stripe = getStripe();
  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub?.stripeSubscriptionId) {
    throw new Error("no active Stripe subscription to cancel");
  }
  if (atPeriodEnd) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await prisma.subscription.update({
      where: { tenantId },
      data: { cancelAtPeriodEnd: true },
    });
  } else {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "CANCELED", cancelAtPeriodEnd: false },
    });
  }
}

export async function reactivateSubscription(tenantId: string): Promise<void> {
  const stripe = getStripe();
  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub?.stripeSubscriptionId) {
    throw new Error("no Stripe subscription to reactivate");
  }
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
  await prisma.subscription.update({
    where: { tenantId },
    data: { cancelAtPeriodEnd: false },
  });
}
