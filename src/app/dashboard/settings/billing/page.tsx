"use client";
import { btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";

type PlanKey = "trial" | "starter" | "growth" | "pro";

const PLAN_PRICING: Record<Exclude<PlanKey, "trial">, { price: number; label: string }> = {
  starter: { price: 399, label: "Starter" },
  growth: { price: 599, label: "Growth" },
  pro: { price: 899, label: "Pro" },
};

export default function BillingSettingsPage() {
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data: sub } = trpc.billing.getSubscription.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();
  const { data: invoices } = trpc.billing.listInvoices.useQuery();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const checkout = trpc.billing.startCheckout.useMutation({
    onSuccess: (r) => {
      if (r?.url) window.location.href = r.url;
    },
    onError: (e) => setErr(e.message),
    onSettled: () => setBusy(null),
  });
  const portal = trpc.billing.openPortal.useMutation({
    onSuccess: (r) => {
      if (r?.url) window.location.href = r.url;
    },
    onError: (e) => setErr(e.message),
    onSettled: () => setBusy(null),
  });
  const cancel = trpc.billing.cancel.useMutation({
    onSuccess: async () => {
      await utils.billing.getSubscription.invalidate();
    },
    onError: (e) => setErr(e.message),
    onSettled: () => setBusy(null),
  });
  const reactivate = trpc.billing.reactivate.useMutation({
    onSuccess: async () => {
      await utils.billing.getSubscription.invalidate();
    },
    onError: (e) => setErr(e.message),
    onSettled: () => setBusy(null),
  });

  const stripeConfigured = sub?.stripeConfigured ?? false;
  const currentPlan = (sub?.plan ?? "trial") as PlanKey;

  const barPct = useMemo(() => {
    if (!usage || usage.pct === Number.POSITIVE_INFINITY) return 100;
    return Math.min(100, Math.round(usage.pct * 100));
  }, [usage]);

  return (
    <div style={{ padding: "20px 28px", maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
        Billing
      </h1>
      <p style={{ fontSize: 13, color: "var(--fg-1)", margin: "0 0 18px" }}>
        Manage your subscription, payment method, and invoices.
      </p>

      {!stripeConfigured && (
        <Card>
          <strong style={{ fontSize: 13 }}>Stripe is not configured.</strong>
          <div style={{ fontSize: 12, color: "var(--fg-1)", marginTop: 6 }}>
            All tenants run on <strong>TRIAL</strong> mode. Admin billing actions are disabled until
            <code style={{ marginLeft: 4 }}>STRIPE_SECRET_KEY</code> is set.
          </div>
        </Card>
      )}

      {err && (
        <Card tone="danger">
          <strong style={{ fontSize: 12 }}>Error:</strong>{" "}
          <span style={{ fontSize: 12 }}>{err}</span>
        </Card>
      )}

      {/* Current plan */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
              CURRENT PLAN
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
              {sub?.planLabel ?? "Trial"}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-1)", marginTop: 4 }}>
              ${((sub?.priceCents ?? 0) / 100).toFixed(0)} / month
            </div>
          </div>
          <StatusPill status={sub?.status ?? "TRIALING"} />
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--fg-1)" }}>
          {sub?.currentPeriodEnd ? (
            <>Renewal: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</>
          ) : (
            <>No active subscription</>
          )}
          {sub?.cancelAtPeriodEnd && (
            <span style={{ marginLeft: 8, color: "var(--amber)" }}>
              (will not renew — cancels at period end)
            </span>
          )}
          {sub?.trialEndsAt && currentPlan === "trial" && (
            <span style={{ marginLeft: 8 }}>
              Trial ends: {new Date(sub.trialEndsAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            style={btnStyle(theme, "primary")}
            disabled={!stripeConfigured || busy !== null}
            onClick={() => {
              setBusy("portal");
              setErr(null);
              portal.mutate();
            }}
          >
            {busy === "portal" ? "opening…" : "Manage in Stripe portal"}
          </button>
          {sub?.cancelAtPeriodEnd ? (
            <button
              type="button"
              style={btnStyle(theme)}
              disabled={!stripeConfigured || busy !== null}
              onClick={() => {
                setBusy("reactivate");
                setErr(null);
                reactivate.mutate();
              }}
            >
              {busy === "reactivate" ? "…" : "reactivate"}
            </button>
          ) : (
            <button
              type="button"
              style={btnStyle(theme)}
              disabled={!stripeConfigured || busy !== null || currentPlan === "trial"}
              onClick={() => {
                if (!confirm("Cancel subscription at period end?")) return;
                setBusy("cancel");
                setErr(null);
                cancel.mutate({ atPeriodEnd: true });
              }}
            >
              {busy === "cancel" ? "…" : "cancel at period end"}
            </button>
          )}
        </div>
      </Card>

      {/* Usage */}
      <Card>
        <div style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
          USAGE THIS MONTH
        </div>
        {usage ? (
          <>
            <div style={{ fontSize: 15, marginTop: 6 }}>
              {usage.leadsUsed.toLocaleString()} /{" "}
              {usage.leadsLimit == null ? "Unlimited" : usage.leadsLimit.toLocaleString()} leads
            </div>
            {usage.leadsLimit != null && (
              <div
                style={{
                  marginTop: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "var(--bg-2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barPct}%`,
                    height: "100%",
                    background: usage.over
                      ? "var(--red)"
                      : usage.warn
                        ? "var(--amber)"
                        : "var(--accent)",
                    transition: "width 200ms",
                  }}
                />
              </div>
            )}
            {usage.warn && !usage.over && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--amber)" }}>
                You&apos;re at {Math.round(usage.pct * 100)}% of your monthly quota. Upgrade before
                you exceed it.
              </div>
            )}
            {usage.over && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--red)" }}>
                Monthly quota exceeded. New leads are being rejected with{" "}
                <code>plan_quota_exceeded</code>.
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>loading…</div>
        )}
      </Card>

      {/* Change plan grid */}
      <div style={{ marginTop: 24, marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Change plan</h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {(["starter", "growth", "pro"] as const).map((k) => {
          const active = currentPlan === k;
          const info = PLAN_PRICING[k];
          return (
            <div
              key={k}
              style={{
                padding: 16,
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--bg-1)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
                {info.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>${info.price}/mo</div>
              <button
                type="button"
                style={active ? btnStyle(theme) : btnStyle(theme, "primary")}
                disabled={!stripeConfigured || active || busy !== null}
                onClick={() => {
                  setBusy(`checkout-${k}`);
                  setErr(null);
                  checkout.mutate({ plan: k });
                }}
              >
                {active
                  ? "current"
                  : busy === `checkout-${k}`
                    ? "opening…"
                    : currentPlan === "trial"
                      ? `choose ${info.label}`
                      : `switch to ${info.label}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      <div style={{ marginTop: 24, marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Invoices</h2>
      </div>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {invoices && invoices.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-2)" }}>
                <th style={th}>Date</th>
                <th style={th}>Period</th>
                <th style={th}>Amount</th>
                <th style={th}>Status</th>
                <th style={th}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td style={td}>
                    {new Date(inv.periodStart).toLocaleDateString()} –{" "}
                    {new Date(inv.periodEnd).toLocaleDateString()}
                  </td>
                  <td style={td}>
                    ${(inv.amountCents / 100).toFixed(2)} {inv.currency.toUpperCase()}
                  </td>
                  <td style={td}>{inv.status}</td>
                  <td style={td}>
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                        download
                      </a>
                    )}
                    {!inv.pdfUrl && inv.hostedInvoiceUrl && (
                      <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                        view
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--fg-2)" }}>
            No invoices yet.
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <div
      style={{
        padding: 16,
        border: tone === "danger" ? "1px solid var(--red)" : "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--bg-1)",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = (() => {
    switch (status) {
      case "ACTIVE":
        return "var(--green)";
      case "TRIALING":
        return "var(--accent)";
      case "PAST_DUE":
      case "UNPAID":
        return "var(--amber)";
      case "CANCELED":
      case "INCOMPLETE":
        return "var(--red)";
      default:
        return "var(--fg-2)";
    }
  })();
  return (
    <span
      style={{
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        padding: "4px 8px",
        borderRadius: 4,
        border: `1px solid ${color}`,
        color,
      }}
    >
      {status}
    </span>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "var(--fg-2)",
  textTransform: "uppercase",
  textAlign: "left",
  fontWeight: 500,
};
const td: React.CSSProperties = { padding: "10px 12px" };
