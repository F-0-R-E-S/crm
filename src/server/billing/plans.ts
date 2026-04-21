/**
 * v2.0 S2.0-3 — Plan-tier metadata + Stripe price-id mapping.
 *
 * These are the *source-of-truth* plan limits used by `plan-gates.ts` to
 * reject intake when a tenant exceeds quota. Plan labels must line up with
 * what Stripe Checkout sends back on `customer.subscription.created` via the
 * STRIPE_PRICE_<TIER> env vars.
 */
import { env } from "@/lib/env";

export type PlanTier = "trial" | "starter" | "growth" | "pro";

export interface PlanLimits {
  /** Monthly lead-intake quota. `null` = unlimited. */
  maxLeadsPerMonth: number | null;
  /** Max active brokers. `null` = unlimited. */
  maxBrokers: number | null;
  /** Max team seats (Users). `null` = unlimited. */
  maxSeats: number | null;
  /** Monthly list price in USD cents (stub fallback when Stripe is not wired). */
  priceCents: number;
  /** Human-readable label. */
  label: string;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  trial: {
    maxLeadsPerMonth: 1_000,
    maxBrokers: 1,
    maxSeats: 2,
    priceCents: 0,
    label: "Trial",
  },
  starter: {
    maxLeadsPerMonth: 50_000,
    maxBrokers: 3,
    maxSeats: 2,
    priceCents: 39900,
    label: "Starter",
  },
  growth: {
    maxLeadsPerMonth: 250_000,
    maxBrokers: 10,
    maxSeats: 10,
    priceCents: 59900,
    label: "Growth",
  },
  pro: {
    maxLeadsPerMonth: null,
    maxBrokers: null,
    maxSeats: null,
    priceCents: 89900,
    label: "Pro",
  },
};

export const BILLABLE_PLANS: readonly PlanTier[] = ["starter", "growth", "pro"] as const;

export function isPlanTier(v: string): v is PlanTier {
  return v === "trial" || v === "starter" || v === "growth" || v === "pro";
}

/**
 * Resolve a billable plan tier → Stripe price id from env. Returns null if
 * the env var is unset (Stripe not configured for that tier).
 */
export function stripePriceIdFor(plan: PlanTier): string | null {
  switch (plan) {
    case "starter":
      return env.STRIPE_PRICE_STARTER ?? null;
    case "growth":
      return env.STRIPE_PRICE_GROWTH ?? null;
    case "pro":
      return env.STRIPE_PRICE_PRO ?? null;
    default:
      return null;
  }
}

/**
 * Reverse-lookup: given a Stripe price id from a webhook payload, resolve
 * back to our plan tier. Returns null if we don't recognize the price.
 */
export function planFromStripePriceId(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  return null;
}
