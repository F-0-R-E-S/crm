import { handleStripeEvent } from "@/server/billing/webhook";
/**
 * v2.0 S2.0-3 — Stripe webhook dispatcher integration tests.
 *
 * Exercises `handleStripeEvent` directly with hand-rolled Stripe.Event fixtures.
 * Does NOT go through the HTTP route (signature verification covered in unit).
 */
import { prisma } from "@/server/db";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

// Emitting Telegram from the webhook enqueues pg-boss jobs we don't need to run
// in tests; stub the emitter.
vi.mock("@/server/telegram/emit", () => ({
  emitTelegramEvent: vi.fn(async () => 0),
}));

function subEvent(
  type:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted",
  opts: {
    tenantId: string;
    subId?: string;
    customerId?: string;
    status?: Stripe.Subscription.Status;
    plan?: string;
    periodStart?: number;
    periodEnd?: number;
    cancelAtPeriodEnd?: boolean;
  },
): Stripe.Event {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type,
    api_version: "2024-11-20",
    created: now,
    livemode: false,
    object: "event",
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: opts.subId ?? `sub_${Math.random().toString(36).slice(2)}`,
        object: "subscription",
        customer: opts.customerId ?? "cus_test",
        status: opts.status ?? "active",
        cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
        current_period_start: opts.periodStart ?? now,
        current_period_end: opts.periodEnd ?? now + 30 * 86_400,
        trial_end: null,
        metadata: { tenantId: opts.tenantId, plan: opts.plan ?? "starter" },
        items: {
          object: "list",
          has_more: false,
          data: [{ price: { id: "price_test" } }],
        },
      } as unknown as Stripe.Subscription,
    },
  } as unknown as Stripe.Event;
}

function invoiceEvent(
  type: "invoice.paid" | "invoice.payment_failed",
  opts: {
    tenantId: string;
    invoiceId?: string;
    customerId?: string;
    amountCents?: number;
    status?: string;
  },
): Stripe.Event {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type,
    api_version: "2024-11-20",
    created: now,
    livemode: false,
    object: "event",
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: opts.invoiceId ?? `in_${Math.random().toString(36).slice(2)}`,
        object: "invoice",
        customer: opts.customerId ?? "cus_test",
        amount_due: opts.amountCents ?? 59900,
        amount_paid: type === "invoice.paid" ? (opts.amountCents ?? 59900) : 0,
        currency: "usd",
        status: opts.status ?? (type === "invoice.paid" ? "paid" : "open"),
        period_start: now,
        period_end: now + 30 * 86_400,
        hosted_invoice_url: "https://stripe.test/inv/x",
        invoice_pdf: "https://stripe.test/inv/x.pdf",
        metadata: { tenantId: opts.tenantId },
      } as unknown as Stripe.Invoice,
    },
  } as unknown as Stripe.Event;
}

describe("billing webhook — handleStripeEvent", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.tenant.create({
      data: {
        id: "tenant-sub-1",
        slug: "sub1",
        name: "Sub Test",
        displayName: "Sub Test Tenant",
      },
    });
  });

  it("skips unhandled event types", async () => {
    const ev = {
      type: "customer.created",
      data: { object: {} },
      id: "x",
    } as unknown as Stripe.Event;
    const res = await handleStripeEvent(ev);
    expect(res.skipped).toBe(true);
  });

  it("creates a Subscription row on customer.subscription.created", async () => {
    const res = await handleStripeEvent(
      subEvent("customer.subscription.created", {
        tenantId: "tenant-sub-1",
        subId: "sub_new",
        plan: "starter",
      }),
    );
    expect(res.ok).toBe(true);
    const sub = await prisma.subscription.findUnique({ where: { tenantId: "tenant-sub-1" } });
    expect(sub?.plan).toBe("starter");
    expect(sub?.status).toBe("ACTIVE");
    expect(sub?.stripeSubscriptionId).toBe("sub_new");
  });

  it("updates existing Subscription on customer.subscription.updated", async () => {
    await prisma.subscription.create({
      data: {
        tenantId: "tenant-sub-1",
        plan: "trial",
        status: "TRIALING",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 86_400 * 1000),
        stripeSubscriptionId: "sub_up",
      },
    });
    await handleStripeEvent(
      subEvent("customer.subscription.updated", {
        tenantId: "tenant-sub-1",
        subId: "sub_up",
        plan: "growth",
        status: "active",
      }),
    );
    const sub = await prisma.subscription.findUnique({ where: { tenantId: "tenant-sub-1" } });
    expect(sub?.plan).toBe("growth");
    expect(sub?.status).toBe("ACTIVE");
  });

  it("flips status to CANCELED on customer.subscription.deleted", async () => {
    await prisma.subscription.create({
      data: {
        tenantId: "tenant-sub-1",
        plan: "starter",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400 * 1000),
        stripeSubscriptionId: "sub_del",
      },
    });
    await handleStripeEvent(
      subEvent("customer.subscription.deleted", {
        tenantId: "tenant-sub-1",
        subId: "sub_del",
        plan: "starter",
        status: "canceled",
      }),
    );
    const sub = await prisma.subscription.findUnique({ where: { tenantId: "tenant-sub-1" } });
    expect(sub?.status).toBe("CANCELED");
  });

  it("inserts an Invoice row on invoice.paid", async () => {
    const res = await handleStripeEvent(
      invoiceEvent("invoice.paid", { tenantId: "tenant-sub-1", invoiceId: "in_paid_1" }),
    );
    expect(res.ok).toBe(true);
    const inv = await prisma.invoice.findUnique({ where: { stripeInvoiceId: "in_paid_1" } });
    expect(inv?.status).toBe("paid");
    expect(inv?.paidAt).toBeTruthy();
  });

  it("flips subscription PAST_DUE + inserts Invoice on invoice.payment_failed", async () => {
    await prisma.subscription.create({
      data: {
        tenantId: "tenant-sub-1",
        plan: "starter",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400 * 1000),
      },
    });
    await handleStripeEvent(
      invoiceEvent("invoice.payment_failed", {
        tenantId: "tenant-sub-1",
        invoiceId: "in_fail_1",
      }),
    );
    const inv = await prisma.invoice.findUnique({ where: { stripeInvoiceId: "in_fail_1" } });
    expect(inv).toBeTruthy();
    expect(inv?.paidAt).toBeNull();
    const sub = await prisma.subscription.findUnique({ where: { tenantId: "tenant-sub-1" } });
    expect(sub?.status).toBe("PAST_DUE");
  });

  it("returns skipped if no tenantId can be resolved", async () => {
    const ev = subEvent("customer.subscription.created", {
      tenantId: "",
      subId: "sub_orphan",
    });
    // Wipe the metadata tenantId so resolution fails and customer lookup misses.
    (ev.data.object as unknown as { metadata: Record<string, string> }).metadata = {};
    (ev.data.object as unknown as { customer: string }).customer = "cus_unknown";
    const res = await handleStripeEvent(ev);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("no_tenant");
  });
});
