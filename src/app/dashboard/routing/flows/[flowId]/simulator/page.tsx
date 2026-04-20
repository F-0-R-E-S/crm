"use client";
import { CodeBlock, Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import Link from "next/link";
import { use, useState } from "react";

type SimulateResult = {
  selected_target: string | null;
  selected_broker_id: string | null;
  algorithm_used: string | null;
  algorithm_source: string | null;
  filters_applied: Array<{ step: string; node_id?: string; ok: boolean; detail?: unknown }>;
  fallback_path: Array<{ from: string; to: string; reason: string }>;
  outcome: "selected" | "no_route" | "error";
  reason: string | null;
  decision_time_ms: number;
  trace_token: string | null;
  flow_version_id: string;
};

function outcomeTone(o: string) {
  if (o === "selected") return "success" as const;
  if (o === "no_route") return "warn" as const;
  return "danger" as const;
}

export default function SimulatorPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = use(params);
  const { theme } = useThemeCtx();
  const [form, setForm] = useState({
    geo: "UA",
    affiliate_id: "aff-sim-1",
    sub_id: "",
    email: "sim@example.com",
  });
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setErr(null);
    try {
      const r = await fetch("/api/v1/routing/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow_id: flowId,
          lead: {
            geo: form.geo,
            affiliate_id: form.affiliate_id,
            sub_id: form.sub_id || undefined,
            email: form.email || undefined,
          },
        }),
      });
      const body = await r.json();
      if (!r.ok) {
        setErr(body.error?.code ?? "unknown");
        setResult(null);
      } else {
        setResult(body);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Route Simulator
        </h1>
        <Link
          href={`/dashboard/routing/flows/${flowId}` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← flow detail
        </Link>
        <span style={{ fontSize: 11, color: "var(--fg-2)" }}>
          dry-run · no caps consumed · no push to broker
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
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
            Lead payload
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <Field
              label="GEO (ISO-3166-1 alpha-2)"
              value={form.geo}
              onChange={(v) => setForm({ ...form, geo: v.toUpperCase().slice(0, 2) })}
            />
            <Field
              label="Affiliate id"
              value={form.affiliate_id}
              onChange={(v) => setForm({ ...form, affiliate_id: v })}
            />
            <Field
              label="Sub id"
              value={form.sub_id}
              onChange={(v) => setForm({ ...form, sub_id: v })}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={running}
              onClick={run}
            >
              {running ? "Simulating…" : "Run simulate"}
            </button>
            {err && (
              <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>error: {err}</div>
            )}
          </div>
        </section>

        <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Explain result</span>
            {result && (
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                {result.decision_time_ms.toFixed(1)}ms
              </span>
            )}
          </div>
          <div style={{ padding: 14 }}>
            {!result && (
              <div style={{ color: "var(--fg-2)" }}>Run a simulation to see the decision trace.</div>
            )}
            {result && (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <Pill tone={outcomeTone(result.outcome)} size="xs">
                    {result.outcome}
                  </Pill>
                  {result.reason && (
                    <Pill tone="warn" size="xs">
                      {result.reason}
                    </Pill>
                  )}
                  {result.algorithm_used && (
                    <Pill size="xs">
                      {result.algorithm_used} · {result.algorithm_source}
                    </Pill>
                  )}
                  {result.selected_broker_id && (
                    <Pill tone="info" size="xs">
                      broker: {result.selected_broker_id.slice(0, 10)}
                    </Pill>
                  )}
                </div>

                <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>
                  Steps applied
                </div>
                <table style={{ width: "100%", fontSize: 12, marginBottom: 14 }}>
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
                      <th style={{ padding: "6px 0" }}>step</th>
                      <th>node</th>
                      <th>ok</th>
                      <th>detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.filters_applied.map((s, i) => (
                      <tr
                        key={`${s.step}-${i}`}
                        style={{ borderTop: "1px solid var(--bd-1)" }}
                      >
                        <td style={{ padding: "6px 0", fontFamily: "var(--mono)" }}>{s.step}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>
                          {s.node_id ?? "—"}
                        </td>
                        <td>
                          <Pill tone={s.ok ? "success" : "warn"} size="xs">
                            {s.ok ? "ok" : "fail"}
                          </Pill>
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 10,
                            color: "var(--fg-2)",
                          }}
                        >
                          {s.detail ? JSON.stringify(s.detail) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <CodeBlock label="raw explain" data={result} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  const { theme } = useThemeCtx();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle(theme)}
      />
    </label>
  );
}
