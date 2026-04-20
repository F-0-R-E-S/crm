"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type ErrorsResponse = {
  broker_id: string;
  from: string;
  to: string;
  total_pushes: number;
  success_pushes: number;
  error_pushes: number;
  timeout_pushes: number;
  error_rate: number;
  timeout_rate: number;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  top_error_codes: Array<{ code: string; count: number }>;
  sla: { error_rate_alert: boolean; latency_p95_alert: boolean };
};

function isoDaysAgo(d: number) {
  return new Date(Date.now() - d * 24 * 3600 * 1000).toISOString();
}

export default function BrokerErrorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const [range, setRange] = useState({ from: isoDaysAgo(1), to: new Date().toISOString() });
  const [data, setData] = useState<ErrorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/v1/brokers/${id}/errors?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      );
      const body = await r.json();
      if (!r.ok) {
        setErr(body.error?.code ?? "unknown");
        setData(null);
      } else {
        setData(body);
      }
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, range.from, range.to]);

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Broker Errors & SLA
        </h1>
        <Link
          href={`/dashboard/brokers/${id}` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← back to broker
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { label: "1h", d: 1 / 24 },
          { label: "24h", d: 1 },
          { label: "7d", d: 7 },
          { label: "30d", d: 30 },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            style={btnStyle(theme)}
            onClick={() =>
              setRange({
                from: new Date(Date.now() - p.d * 24 * 3600 * 1000).toISOString(),
                to: new Date().toISOString(),
              })
            }
          >
            {p.label}
          </button>
        ))}
        <input
          type="datetime-local"
          value={range.from.slice(0, 16)}
          onChange={(e) => setRange({ ...range, from: new Date(e.target.value).toISOString() })}
          style={inputStyle(theme)}
        />
        <input
          type="datetime-local"
          value={range.to.slice(0, 16)}
          onChange={(e) => setRange({ ...range, to: new Date(e.target.value).toISOString() })}
          style={inputStyle(theme)}
        />
      </div>

      {loading && <div style={{ color: "var(--fg-2)" }}>loading…</div>}
      {err && <div style={{ color: "oklch(72% 0.15 25)" }}>error: {err}</div>}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Tile label="total pushes" value={data.total_pushes} />
            <Tile label="success" value={data.success_pushes} valueColor="oklch(80% 0.18 140)" />
            <Tile
              label="errors"
              value={data.error_pushes}
              sub={`${(data.error_rate * 100).toFixed(2)}%`}
              alert={data.sla.error_rate_alert}
            />
            <Tile
              label="timeouts"
              value={data.timeout_pushes}
              sub={`${(data.timeout_rate * 100).toFixed(2)}%`}
            />
            <Tile
              label="latency p50"
              value={data.latency_p50_ms ?? "—"}
              sub={data.latency_p50_ms ? "ms" : undefined}
            />
            <Tile
              label="latency p95"
              value={data.latency_p95_ms ?? "—"}
              sub={data.latency_p95_ms ? "ms" : undefined}
              alert={data.sla.latency_p95_alert}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {data.sla.error_rate_alert && (
              <Pill tone="danger" size="xs">
                SLA: error_rate &gt; 5%
              </Pill>
            )}
            {data.sla.latency_p95_alert && (
              <Pill tone="danger" size="xs">
                SLA: p95 &gt; 3s
              </Pill>
            )}
            {!data.sla.error_rate_alert && !data.sla.latency_p95_alert && (
              <Pill tone="success" size="xs">
                SLA: healthy
              </Pill>
            )}
          </div>

          <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--bd-1)",
                background: "var(--bg-2)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Top error codes
            </div>
            {data.top_error_codes.length === 0 ? (
              <div style={{ padding: 24, color: "var(--fg-2)" }}>No errors in range.</div>
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
                    <th style={{ padding: "8px 14px" }}>code</th>
                    <th>count</th>
                    <th>share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_error_codes.map((e) => (
                    <tr key={e.code} style={{ borderTop: "1px solid var(--bd-1)" }}>
                      <td style={{ padding: "8px 14px", fontFamily: "var(--mono)" }}>{e.code}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{e.count}</td>
                      <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                        {data.error_pushes > 0
                          ? `${((e.count / data.error_pushes) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
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

function Tile({
  label,
  value,
  sub,
  valueColor,
  alert,
}: {
  label: string;
  value: number | string;
  sub?: string;
  valueColor?: string;
  alert?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 6,
        padding: 12,
        background: alert ? "oklch(28% 0.08 25)" : "transparent",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-2)",
          fontFamily: "var(--mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          marginTop: 4,
          color: alert ? "oklch(72% 0.18 25)" : (valueColor ?? "var(--fg-0)"),
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>{sub}</div>
      )}
    </div>
  );
}
