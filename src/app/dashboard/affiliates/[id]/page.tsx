"use client";
import { Pill, TabStrip, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { use, useState } from "react";

type Tab = "overview" | "keys" | "postback" | "history";

type QTrendPoint = { date: string; avgQ: number | null; leads: number };

function qualityTone(avg: number | null): "green" | "amber" | "red" | "muted" {
  if (avg == null) return "muted";
  if (avg >= 71) return "green";
  if (avg >= 41) return "amber";
  return "red";
}

function qualityStroke(avg: number | null) {
  switch (qualityTone(avg)) {
    case "green":
      return "oklch(72% 0.15 150)";
    case "amber":
      return "oklch(72% 0.15 80)";
    case "red":
      return "oklch(72% 0.15 25)";
    default:
      return "var(--fg-2)";
  }
}

function QualityTrendWidget({ data }: { data: QTrendPoint[] }) {
  const W = 800;
  const H = 160;
  const PAD = { t: 10, r: 12, b: 22, l: 32 };
  const values = data.map((d) => d.avgQ ?? 0);
  const max = Math.max(100, ...values);
  const min = 0;
  const range = max - min || 1;
  const n = Math.max(1, data.length - 1);
  // 7-day moving average
  const ma: Array<number | null> = data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1).filter((p) => p.avgQ != null);
    if (slice.length === 0) return null;
    return slice.reduce((s, p) => s + (p.avgQ ?? 0), 0) / slice.length;
  });
  const currentAvg = ma.length > 0 ? ma[ma.length - 1] : null;
  const xAt = (i: number) => PAD.l + (data.length === 1 ? 0 : (i / n) * (W - PAD.l - PAD.r));
  const yAt = (v: number) => H - PAD.b - ((v - min) / range) * (H - PAD.t - PAD.b);
  const seriesPath = data
    .filter((p) => p.avgQ != null)
    .map((p, i, arr) => {
      const idx = data.indexOf(p);
      return `${i === 0 ? "M" : "L"}${xAt(idx).toFixed(1)},${yAt(p.avgQ as number).toFixed(1)}`;
    })
    .join(" ");
  const maPath = ma
    .map((v, i) => (v == null ? null : `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`))
    .filter(Boolean)
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt}`)
    .join(" ");

  return (
    <div
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 6,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--mono)",
            color: "var(--fg-2)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          quality trend · last {data.length || 30} days
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--mono)",
            color: qualityStroke(currentAvg),
            fontWeight: 500,
          }}
        >
          7d avg: {currentAvg != null ? Math.round(currentAvg) : "—"}
        </div>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: 24, fontSize: 12, color: "var(--fg-2)", textAlign: "center" }}>
          No quality data yet.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: H, display: "block" }}
          role="img"
          aria-label="quality trend"
        >
          <title>quality trend</title>
          {[0, 40, 70, 100].map((y) => (
            <line
              key={`g-${y}`}
              x1={PAD.l}
              x2={W - PAD.r}
              y1={yAt(y)}
              y2={yAt(y)}
              stroke="var(--bd-1)"
              strokeDasharray={y === 0 ? "0" : "2 3"}
              strokeWidth={0.8}
            />
          ))}
          {[0, 40, 70, 100].map((y) => (
            <text
              key={`gl-${y}`}
              x={PAD.l - 6}
              y={yAt(y) + 3}
              fontSize={9}
              fontFamily="var(--mono)"
              fill="var(--fg-2)"
              textAnchor="end"
            >
              {y}
            </text>
          ))}
          {seriesPath && (
            <path
              d={seriesPath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
          )}
          {maPath && (
            <path
              d={maPath}
              fill="none"
              stroke={qualityStroke(currentAvg)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
    </div>
  );
}

const EVENT_KINDS = ["lead_pushed", "accepted", "declined", "ftd", "failed"] as const;

type SeriesPoint = { ts: string; leads: number; ftds: number; rejects: number };

function Sparkline({ series }: { series: SeriesPoint[] }) {
  const W = 800;
  const H = 140;
  const PAD = { t: 8, r: 8, b: 18, l: 28 };
  const n = series.length || 24;
  const bw = (W - PAD.l - PAD.r) / n;
  const max = Math.max(1, ...series.map((p) => p.leads));
  const gridLines = 4;

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: H, display: "block" }}
        role="img"
        aria-label="leads by hour"
      >
        {/* grid */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = PAD.t + ((H - PAD.t - PAD.b) * i) / gridLines;
          const v = Math.round(max - (max * i) / gridLines);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count grid line — positional
            <g key={i}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y}
                y2={y}
                stroke="var(--bd-1)"
                strokeDasharray={i === gridLines ? "0" : "2 3"}
                strokeWidth={0.8}
              />
              <text
                x={PAD.l - 6}
                y={y + 3}
                fontSize={9}
                fontFamily="var(--mono)"
                fill="var(--fg-2)"
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          );
        })}
        {/* bars */}
        {series.map((p, i) => {
          const x = PAD.l + i * bw;
          const hLead = ((H - PAD.t - PAD.b) * p.leads) / max;
          const hRej = ((H - PAD.t - PAD.b) * p.rejects) / max;
          const barW = Math.max(1, bw - 2);
          return (
            <g key={p.ts}>
              <rect
                x={x + 1}
                y={H - PAD.b - hLead}
                width={barW}
                height={Math.max(0, hLead)}
                fill="var(--accent)"
                opacity={0.85}
              >
                <title>
                  {new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {p.leads} leads · {p.rejects} rejects · {p.ftds} ftds
                </title>
              </rect>
              {p.rejects > 0 && (
                <rect
                  x={x + 1}
                  y={H - PAD.b - hRej}
                  width={barW}
                  height={Math.max(0, hRej)}
                  fill="oklch(72% 0.15 25)"
                  opacity={0.9}
                />
              )}
            </g>
          );
        })}
        {/* x-axis tick labels every 6h */}
        {series.map((p, i) => {
          if (i % 6 !== 0 && i !== series.length - 1) return null;
          const x = PAD.l + i * bw + bw / 2;
          const d = new Date(p.ts);
          const h = String(d.getUTCHours()).padStart(2, "0");
          return (
            <text
              key={`x-${p.ts}`}
              x={x}
              y={H - 4}
              fontSize={9}
              fontFamily="var(--mono)"
              fill="var(--fg-2)"
              textAnchor="middle"
            >
              {h}:00
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function AffiliateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data } = trpc.affiliate.byId.useQuery({ id });
  const { data: stats } = trpc.affiliate.stats.useQuery({ id }, { refetchInterval: 15_000 });
  const { data: qTrend } = trpc.affiliate.qualityTrend.useQuery({ affiliateId: id, days: 30 });
  const update = trpc.affiliate.update.useMutation({
    onSuccess: () => utils.affiliate.byId.invalidate({ id }),
  });
  const gen = trpc.affiliate.generateApiKey.useMutation({
    onSuccess: () => utils.affiliate.byId.invalidate({ id }),
  });
  const revoke = trpc.affiliate.revokeApiKey.useMutation({
    onSuccess: () => utils.affiliate.byId.invalidate({ id }),
  });
  const [tab, setTab] = useState<Tab>("overview");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [showRaw, setShowRaw] = useState<string | null>(null);

  if (!data) return <div style={{ padding: 28 }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, margin: "0 0 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {data.name}
        </h1>
        <Link
          href={`/dashboard/affiliates/${id}/intake-settings` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          intake settings →
        </Link>
        <Link
          href={`/dashboard/affiliates/${id}/webhooks` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          intake webhooks →
        </Link>
      </div>
      <TabStrip<Tab>
        tabs={[
          { key: "overview", label: "overview" },
          { key: "keys", label: "api keys" },
          { key: "postback", label: "postback" },
          { key: "history", label: "history" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "leads / 24h", value: stats?.kpi.leads24h ?? "—" },
              { label: "ftds / 24h", value: stats?.kpi.ftds24h ?? "—" },
              { label: "rejects / 24h", value: stats?.kpi.rejects24h ?? "—" },
              {
                label: "cap usage (today)",
                value: `${stats?.kpi.capUsed ?? 0} / ${data.totalDailyCap ?? "∞"}`,
              },
            ].map((t) => (
              <div
                key={t.label}
                style={{ padding: "14px 16px", border: "1px solid var(--bd-1)", borderRadius: 6 }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono)",
                    color: "var(--fg-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 500,
                    marginTop: 6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              border: "1px solid var(--bd-1)",
              borderRadius: 6,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  color: "var(--fg-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                leads · last 24h (hourly)
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "var(--mono)",
                  color: "var(--fg-2)",
                  display: "flex",
                  gap: 14,
                }}
              >
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      background: "var(--accent)",
                      marginRight: 5,
                      verticalAlign: "middle",
                    }}
                  />
                  leads
                </span>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      background: "oklch(72% 0.15 25)",
                      marginRight: 5,
                      verticalAlign: "middle",
                    }}
                  />
                  rejects
                </span>
              </div>
            </div>
            <Sparkline series={stats?.series ?? []} />
          </div>
          <QualityTrendWidget data={qTrend ?? []} />
        </div>
      )}

      {tab === "keys" && (
        <div style={{ maxWidth: 640 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>API Keys</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newKeyLabel) return;
              const r = await gen.mutateAsync({ affiliateId: id, label: newKeyLabel });
              setShowRaw(r.rawKey);
              setNewKeyLabel("");
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Label"
              style={{ ...inputStyle(theme), width: 200 }}
            />
            <button type="submit" style={btnStyle(theme, "primary")}>
              Generate
            </button>
          </form>
          {showRaw && (
            <div
              style={{
                padding: 12,
                marginTop: 12,
                background: "rgba(230,180,80,0.08)",
                border: "1px solid rgba(230,180,80,0.25)",
                borderRadius: 4,
                fontFamily: "var(--mono)",
                fontSize: 12,
              }}
            >
              Save this now — won't be shown again:
              <br />
              <strong>{showRaw}</strong>
              <button
                type="button"
                onClick={() => setShowRaw(null)}
                style={{
                  marginLeft: 12,
                  color: "var(--fg-2)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          <table style={{ width: "100%", fontSize: 12, marginTop: 12 }}>
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
                <th style={{ padding: "8px 0" }}>prefix</th>
                <th>label</th>
                <th>last used</th>
                <th>status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.apiKeys.map((k) => (
                <tr key={k.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                  <td style={{ padding: "8px 0", fontFamily: "var(--mono)" }}>{k.keyPrefix}…</td>
                  <td>{k.label}</td>
                  <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}
                  </td>
                  <td>
                    {k.isRevoked ? (
                      <Pill tone="danger" size="xs">
                        revoked
                      </Pill>
                    ) : (
                      <Pill tone="success" size="xs">
                        active
                      </Pill>
                    )}
                  </td>
                  <td>
                    {!k.isRevoked && (
                      <button
                        type="button"
                        onClick={() => revoke.mutate({ id: k.id })}
                        style={{ ...btnStyle(theme), color: "oklch(72% 0.15 25)" }}
                      >
                        revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "postback" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
          <label style={{ display: "block" }}>
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--mono)",
                color: "var(--fg-2)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              Postback URL
            </span>
            <input
              defaultValue={data.postbackUrl ?? ""}
              onBlur={(e) => update.mutate({ id, postbackUrl: e.target.value || null })}
              placeholder="http://tracker.example.com/?click_id={sub_id}&status={status}"
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--mono)",
                color: "var(--fg-2)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              HMAC secret (optional)
            </span>
            <input
              defaultValue={data.postbackSecret ?? ""}
              onBlur={(e) => update.mutate({ id, postbackSecret: e.target.value || null })}
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </label>
          <fieldset style={{ border: "1px solid var(--bd-1)", borderRadius: 4, padding: 12 }}>
            <legend
              style={{
                fontSize: 10,
                fontFamily: "var(--mono)",
                color: "var(--fg-2)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0 6px",
              }}
            >
              Events
            </legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {EVENT_KINDS.map((ev) => (
                <label
                  key={ev}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontFamily: "var(--mono)",
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked={data.postbackEvents.includes(ev)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...data.postbackEvents, ev]
                        : data.postbackEvents.filter((x) => x !== ev);
                      update.mutate({ id, postbackEvents: next as never });
                    }}
                  />
                  {ev}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {tab === "history" && (
        <table style={{ width: "100%", fontSize: 11 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: "var(--fg-2)",
                fontFamily: "var(--mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <th style={{ padding: "8px 0" }}>when</th>
              <th>event</th>
              <th>url</th>
              <th>status</th>
              <th>delivered</th>
              <th>attempts</th>
            </tr>
          </thead>
          <tbody>
            {data.outboundPostbacks.map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                <td style={{ padding: "6px 0", fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                  {new Date(o.createdAt).toLocaleString()}
                </td>
                <td>
                  <Pill size="xs">{o.event}</Pill>
                </td>
                <td
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--fg-2)",
                    maxWidth: 360,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {o.url}
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{o.httpStatus ?? "—"}</td>
                <td>{o.deliveredAt ? "✓" : "✗"}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{o.attemptN}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
