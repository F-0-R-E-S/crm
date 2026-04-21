/**
 * v2.0 S2.0-3 — Stripe webhook endpoint.
 *
 * Public (whitelisted in `src/middleware.ts`). Verifies the Stripe signature
 * using `STRIPE_WEBHOOK_SECRET`, then dispatches to the pure handler.
 */
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/server/billing/stripe";
import { handleStripeEvent } from "@/server/billing/webhook";
import { logger } from "@/server/observability";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Stripe SDK is a Node dep, not Edge-safe.
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  if (!isStripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const raw = await req.text();
  let event: import("stripe").Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn({ event: "stripe.webhook.invalid_signature", err: String(err) });
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    logger.info({
      event: "stripe.webhook.received",
      type: event.type,
      id: event.id,
      result_ok: result.ok,
      tenant_id: result.tenantId ?? null,
      skipped: result.skipped ?? false,
    });
    return NextResponse.json({ ...result, received: true });
  } catch (err) {
    logger.error({ event: "stripe.webhook.handler_error", err: String(err), type: event.type });
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }
}
