"use client";
import { Card, CounterTile, LeadFunnelSankey, MiniBars } from "@/components/router-crm";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DashboardHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarded = searchParams.get("onboarded") === "1";
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const session = useSession();
  const isAdmin = session.data?.user?.role === "ADMIN";
  const counters = trpc.lead.counters.useQuery();
  const funnel = trpc.lead.funnelCounts.useQuery();
  const brokers = trpc.lead.brokerPerformance.useQuery();
  const geos = trpc.lead.topGeos.useQuery();
  const ttfl = trpc.onboarding.adminMetrics.useQuery(undefined, { enabled: isAdmin });

  if (!counters.data || !funnel.data) return <div style={{ padding: 28 }}>Loading…</div>;

  const goto = (url: string) => router.push(url as never);

  return (
    <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      {onboarded && !bannerDismissed && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "oklch(72% 0.15 145 / 0.12)",
            border: "1px solid oklch(72% 0.15 145)",
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--fg-0)",
          }}
        >
          <span>
            You're live. Your first test lead is visible in{" "}
            <a href="/dashboard/leads" style={{ color: "var(--fg-0)" }}>
              /leads
            </a>{" "}
            — try sending one from your app now.
          </span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            style={{
              background: "transparent",
              color: "var(--fg-2)",
              border: "none",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}
      <header style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Operations
        </h1>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
          {new Date().toLocaleString()}
        </span>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <CounterTile
          label="Leads / 24h"
          value={counters.data.leadsToday}
          onClick={() => goto("/dashboard/leads")}
        />
        <CounterTile
          label="FTDs / 24h"
          value={counters.data.ftdsToday}
          onClick={() => goto("/dashboard/leads?state=FTD")}
        />
        <CounterTile
          label="Active brokers"
          value={counters.data.activeBrokers}
          onClick={() => goto("/dashboard/brokers")}
        />
        <CounterTile
          label="Rejects / 24h"
          value={counters.data.rejectsToday}
          onClick={() => goto("/dashboard/leads?state=REJECTED")}
        />
      </div>
      {isAdmin && ttfl.data && (
        <div
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            background: "var(--bg-1)",
            padding: "12px 16px",
            display: "flex",
            gap: 24,
            fontSize: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--mono)",
              color: "var(--fg-2)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Time-to-first-lead (30d)
          </div>
          <div>
            <span style={{ color: "var(--fg-2)" }}>median</span>{" "}
            <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>
              {formatDuration(ttfl.data.medianSeconds)}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--fg-2)" }}>p90</span>{" "}
            <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>
              {formatDuration(ttfl.data.p90Seconds)}
            </span>
          </div>
          <div style={{ color: "var(--fg-2)" }}>n={ttfl.data.count}</div>
        </div>
      )}
      <Card title="Lead funnel" subtitle="Intake → Validation → Routing → Outcome (last 24h)">
        <LeadFunnelSankey counts={funnel.data} width={900} />
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <Card title="Broker performance" subtitle="7-day volume + FTD %">
          <table style={{ width: "100%", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  color: "var(--fg-2)",
                  fontFamily: "var(--mono)",
                  letterSpacing: "0.08em",
                }}
              >
                <th>BROKER</th>
                <th>PUSHED</th>
                <th>FTD</th>
                <th>FAIL</th>
                <th>7-DAY</th>
                <th>FTD %</th>
              </tr>
            </thead>
            <tbody>
              {brokers.data?.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                  <td style={{ padding: "8px 0" }}>{b.name}</td>
                  <td>{b.pushed}</td>
                  <td>{b.ftd}</td>
                  <td>{b.failed}</td>
                  <td>
                    <MiniBars values={b.last7} width={90} height={20} color="var(--fg-1)" />
                  </td>
                  <td>{b.ftdPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Top geos" subtitle="Volume + FTD (24h)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {geos.data?.map((g) => {
              const max = Math.max(...(geos.data ?? []).map((x) => x.volume), 1);
              return (
                <div
                  key={g.geo}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 80px",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}>
                    {g.geo}
                  </span>
                  <div style={{ position: "relative", height: 10 }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "oklch(76% 0.12 220)",
                        opacity: 0.35,
                        width: `${(g.volume / max) * 100}%`,
                        borderRadius: 2,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "oklch(82% 0.17 135)",
                        width: `${(g.ftd / max) * 100}%`,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--fg-2)",
                      textAlign: "right",
                    }}
                  >
                    {g.volume} / {g.ftd} ftd
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
