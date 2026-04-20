import type { Metadata } from "next";
import { TIERS } from "./tiers";

export const metadata: Metadata = {
  title: "Pricing — GambChamp CRM",
  description: "Transparent pricing for affiliate lead distribution. No setup fees.",
};

const ACCENT = "oklch(0.68 0.16 162)";

export default function PricingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-0)",
        color: "var(--fg-0)",
        fontFamily: "var(--sans)",
        fontSize: 13,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 36px",
          borderBottom: "1px solid var(--bd-1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--fg-0)",
              color: "var(--bg-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontFamily: "var(--mono)",
            }}
          >
            G
          </div>
          <div style={{ fontWeight: 600 }}>GambChamp CRM</div>
        </div>
        <nav style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--fg-2)" }}>
          <a href="/" style={linkStyle}>Home</a>
          <a href="/pricing" style={{ ...linkStyle, color: "var(--fg-0)" }}>
            Pricing
          </a>
          <a href="/login" style={linkStyle}>Login</a>
          <a
            href="/signup"
            style={{
              ...linkStyle,
              color: "var(--bg-1)",
              background: "var(--fg-0)",
              padding: "5px 12px",
              borderRadius: 4,
            }}
          >
            Start free trial
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ padding: "56px 36px 36px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Transparent pricing. No setup fees. No surprises.
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--fg-2)",
            maxWidth: 640,
            margin: "16px auto 0",
            lineHeight: 1.5,
          }}
        >
          While competitors quote you $500–$5,000 setup plus opaque "per-lead" add-ons,
          we publish every number on this page. Pick a tier, start a 14-day trial, and
          pay only when you're ready.
        </p>
      </section>

      {/* Tier grid */}
      <section
        style={{
          padding: "20px 36px 48px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 18,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {TIERS.map((t) => (
          <div
            key={t.key}
            style={{
              border: t.highlight ? `1px solid ${ACCENT}` : "1px solid var(--bd-1)",
              borderRadius: 8,
              padding: "24px 22px",
              background: "var(--bg-1)",
              position: "relative",
            }}
          >
            {t.highlight && (
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  right: 18,
                  fontSize: 10,
                  fontFamily: "var(--mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: ACCENT,
                  color: "var(--bg-1)",
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                most popular
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 500 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: "var(--fg-2)", margin: "6px 0 14px" }}>
              {t.tagline}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 18 }}>
              <span style={{ fontSize: 30, fontWeight: 500 }}>{t.price}</span>
              <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{t.priceLabel}</span>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 12,
              }}
            >
              <FeatureRow label="Leads / month" value={t.features.leadsPerMonth} />
              <FeatureRow label="Broker slots" value={t.features.brokerSlots} />
              <FeatureRow label="Team seats" value={t.features.teamSeats} />
              <FeatureRow
                label="Telegram bot"
                value={t.features.telegramBot ? "included" : "—"}
              />
              <FeatureRow label="SLA" value={t.features.sla} />
              <FeatureRow label="Support" value={t.features.support} />
            </ul>
            <a
              href={t.cta.href}
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 22,
                padding: "10px 16px",
                background: t.highlight ? ACCENT : "var(--fg-0)",
                color: "var(--bg-1)",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {t.cta.label}
            </a>
          </div>
        ))}
      </section>

      {/* Comparison matrix */}
      <section style={{ padding: "0 36px 56px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>
          What's in each plan
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            marginTop: 14,
          }}
        >
          <thead>
            <tr style={{ color: "var(--fg-2)", textAlign: "left" }}>
              <th style={cellHead}>Feature</th>
              <th style={cellHead}>Starter</th>
              <th style={cellHead}>Growth</th>
              <th style={cellHead}>Pro</th>
            </tr>
          </thead>
          <tbody>
            <Row feature="Leads / month" s="50,000" g="250,000" p="Unlimited" />
            <Row feature="Broker slots" s="3" g="10" p="Unlimited" />
            <Row feature="Team seats" s="2" g="10" p="Unlimited" />
            <Row feature="Telegram ops bot" s="✓" g="✓" p="✓" />
            <Row feature="SLA" s="Business hours" g="15-min" p="15-min + dedicated" />
            <Row feature="Support channels" s="Email" g="Email + Telegram" p="Email + Telegram + phone" />
          </tbody>
        </table>
      </section>

      <section
        style={{
          padding: "0 36px 72px",
          textAlign: "center",
          fontSize: 13,
          color: "var(--fg-2)",
        }}
      >
        Still deciding? See a 5-minute demo —{" "}
        <a href="#" style={{ color: "var(--fg-0)" }}>
          Watch demo
        </a>
      </section>
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <li style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "var(--fg-2)" }}>{label}</span>
      <span>{value}</span>
    </li>
  );
}

function Row({ feature, s, g, p }: { feature: string; s: string; g: string; p: string }) {
  return (
    <tr style={{ borderTop: "1px solid var(--bd-1)" }}>
      <td style={cell}>{feature}</td>
      <td style={cell}>{s}</td>
      <td style={cell}>{g}</td>
      <td style={cell}>{p}</td>
    </tr>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--fg-2)",
  textDecoration: "none",
};

const cellHead: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  fontFamily: "var(--mono)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 500,
  borderBottom: "1px solid var(--bd-2)",
};

const cell: React.CSSProperties = {
  padding: "10px",
  fontSize: 13,
};
