"use client";
// Routing overview — modernized dashboard-style view.
//
// Sections (top → bottom):
//   1. KPI tiles: active flows · routed 24h · hit-rate · down-brokers
//   2. Flows table (link to editor)
//   3. By-GEO snapshot: received / routed per GEO (last 24h)
//   4. Broker health summary
//   5. Top-5 cap-blocked events (last 24h)
//
// Pulls from the new `routing.overview` tRPC procedure; falls back gracefully
// when data is loading.

import { CounterTile, Pill, btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

function statusTone(s: string) {
  if (s === "PUBLISHED") return "success" as const;
  if (s === "ARCHIVED") return "neutral" as const;
  return "warn" as const;
}

function healthTone(s: string) {
  if (s === "healthy") return "success" as const;
  if (s === "degraded") return "warn" as const;
  if (s === "down") return "danger" as const;
  return "neutral" as const;
}

export default function RoutingOverviewPage() {
  const { theme } = useThemeCtx();
  const { data, isLoading } = trpc.routing.overview.useQuery();

  return (
    <div
      style={{
        padding: "20px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Routing
        </h1>
        <span style={{ fontSize: 11, color: "var(--fg-2)" }}>
          last 24h{data?.since ? ` · since ${new Date(data.since).toLocaleString()}` : ""}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Link
            href={"/dashboard/routing/flows" as never}
            style={{ ...btnStyle(theme), textDecoration: "none" }}
          >
            All flows
          </Link>
        </div>
      </div>

      {isLoading && <div style={{ color: "var(--fg-2)" }}>loading overview…</div>}

      {data && (
        <>
          {/* KPI tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            <CounterTile
              label="Active flows"
              value={data.flows.filter((f) => f.status === "PUBLISHED").length}
            />
            <CounterTile label="Received 24h" value={data.totals.received} />
            <CounterTile label="Routed 24h" value={data.totals.routed} />
            <CounterTile
              label="Hit rate (24h)"
              value={`${Math.round(data.totals.hitRate * 1000) / 10}%`}
            />
          </div>

          {/* Flows table */}
          <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
            <header
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--bd-1)",
                background: "var(--bg-2)",
                fontSize: 13,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Flows</span>
              <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{data.flows.length} rows</span>
            </header>
            {data.flows.length === 0 ? (
              <div style={{ padding: 14, color: "var(--fg-2)" }}>
                No flows yet. Auto-migration creates <code>auto:&lt;GEO&gt;</code> flows on first
                push.
              </div>
            ) : (
              <table style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      color: "var(--fg-2)",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <th style={{ padding: "10px 14px" }}>name</th>
                    <th>status</th>
                    <th>timezone</th>
                    <th>active v#</th>
                    <th>id</th>
                  </tr>
                </thead>
                <tbody>
                  {data.flows.map((f) => (
                    <tr key={f.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                      <td style={{ padding: "8px 14px" }}>
                        <Link
                          href={`/dashboard/routing/flows/${f.id}` as never}
                          style={{
                            color: "var(--fg-0)",
                            textDecoration: "none",
                            fontWeight: 500,
                          }}
                        >
                          {f.name}
                        </Link>
                      </td>
                      <td>
                        <Pill tone={statusTone(f.status)} size="xs">
                          {f.status.toLowerCase()}
                        </Pill>
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{f.timezone}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{f.activeVersionNumber ?? "—"}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                        {f.id.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Two-column: By-GEO + Brokers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <section
              style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}
            >
              <header
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--bd-1)",
                  background: "var(--bg-2)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                By GEO (24h)
              </header>
              {data.geoStats.length === 0 ? (
                <div style={{ padding: 14, color: "var(--fg-2)" }}>
                  No lead activity in the last 24h.
                </div>
              ) : (
                <table style={{ width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        color: "var(--fg-2)",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      <th style={{ padding: "8px 14px" }}>geo</th>
                      <th>received</th>
                      <th>routed</th>
                      <th>hit</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.geoStats.map((g) => {
                      const hit = g.received > 0 ? g.routed / g.received : 0;
                      const pct = Math.round(hit * 100);
                      return (
                        <tr key={g.geo} style={{ borderTop: "1px solid var(--bd-1)" }}>
                          <td
                            style={{
                              padding: "6px 14px",
                              fontFamily: "var(--mono)",
                              fontWeight: 600,
                            }}
                          >
                            {g.geo}
                          </td>
                          <td style={{ fontFamily: "var(--mono)" }}>{g.received}</td>
                          <td style={{ fontFamily: "var(--mono)" }}>{g.routed}</td>
                          <td style={{ fontFamily: "var(--mono)" }}>{pct}%</td>
                          <td
                            aria-hidden
                            style={{
                              paddingRight: 14,
                              width: 120,
                            }}
                          >
                            <div
                              style={{
                                height: 6,
                                background: "var(--bg-3)",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: 6,
                                  width: `${pct}%`,
                                  background: "oklch(70% 0.14 150)",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <section
              style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}
            >
              <header
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--bd-1)",
                  background: "var(--bg-2)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Broker pool
              </header>
              <table style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      color: "var(--fg-2)",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <th style={{ padding: "8px 14px" }}>broker</th>
                    <th>status</th>
                    <th>health</th>
                    <th>daily cap</th>
                  </tr>
                </thead>
                <tbody>
                  {data.brokers.map((b) => (
                    <tr key={b.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                      <td style={{ padding: "6px 14px", fontWeight: 500 }}>{b.name}</td>
                      <td>
                        <Pill size="xs" tone={b.isActive ? "success" : "neutral"}>
                          {b.isActive ? "on" : "off"}
                        </Pill>
                      </td>
                      <td>
                        <Pill size="xs" tone={healthTone(b.lastHealthStatus)}>
                          {b.lastHealthStatus}
                        </Pill>
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{b.dailyCap ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {/* Top cap-blocked */}
          <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
            <header
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--bd-1)",
                background: "var(--bg-2)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Top cap-blocked leads (24h)
            </header>
            {data.topCapBlocked.length === 0 ? (
              <div style={{ padding: 14, color: "var(--fg-2)" }}>
                No cap-blocked events in the last 24h.
              </div>
            ) : (
              <table style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      color: "var(--fg-2)",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <th style={{ padding: "8px 14px" }}>lead</th>
                    <th>geo</th>
                    <th>affiliate</th>
                    <th>events</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCapBlocked.map((r) => (
                    <tr key={r.leadId} style={{ borderTop: "1px solid var(--bd-1)" }}>
                      <td style={{ padding: "6px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>
                        {r.leadId.slice(0, 16)}
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{r.geo}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                        {r.affiliateId.slice(0, 14)}
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{r.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
