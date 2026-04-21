"use client";
// Simulator page rebuild.
//
// Modernized three-section layout:
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │  header                                                            │
//   ├────────────────────────────────────────────────────────────────────┤
//   │  tabs: single · batch                                              │
//   ├─────────────────┬──────────────────────────────────────────────────┤
//   │  lead form      │  execution trace                                 │
//   │  or             │  — decision step list (filter → algorithm       │
//   │  JSON array      │    → broker picked OR fallback reason)         │
//   │                  │  — raw explain json                            │
//   └─────────────────┴──────────────────────────────────────────────────┘
//
// Batch mode takes a JSON array of lead payloads, sends them through the
// simulate REST endpoint serially, and shows a results table. Both modes
// share the execution-trace formatting.

import { CodeBlock, Pill, btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import Link from "next/link";
import { use, useState } from "react";

type SimulateStep = {
  step: string;
  node_id?: string;
  ok: boolean;
  detail?: unknown;
};

type SimulateResult = {
  selected_target: string | null;
  selected_broker_id: string | null;
  algorithm_used: string | null;
  algorithm_source: string | null;
  filters_applied: SimulateStep[];
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

type Mode = "single" | "batch";

type BatchRow = { index: number; ok: boolean; result?: SimulateResult; error?: string };

export default function SimulatorPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = use(params);
  const { theme } = useThemeCtx();
  const [mode, setMode] = useState<Mode>("single");

  // Single-mode form state
  const [form, setForm] = useState({
    geo: "UA",
    affiliate_id: "aff-sim-1",
    sub_id: "",
    email: "sim@example.com",
  });
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Batch-mode state
  const [batchJson, setBatchJson] = useState<string>(`[
  { "geo": "UA", "affiliate_id": "aff-1", "email": "a@example.com" },
  { "geo": "PL", "affiliate_id": "aff-2", "email": "b@example.com" }
]`);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchErr, setBatchErr] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  async function runOne(lead: Record<string, unknown>) {
    const r = await fetch("/api/v1/routing/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ flow_id: flowId, lead }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error?.code ?? `http_${r.status}`);
    return body as SimulateResult;
  }

  async function runSingle() {
    setRunning(true);
    setErr(null);
    try {
      const body = await runOne({
        geo: form.geo,
        affiliate_id: form.affiliate_id,
        sub_id: form.sub_id || undefined,
        email: form.email || undefined,
      });
      setResult(body);
    } catch (e) {
      setErr((e as Error).message);
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  async function runBatch() {
    setBatchRunning(true);
    setBatchErr(null);
    setBatchRows([]);
    try {
      const parsed = JSON.parse(batchJson);
      if (!Array.isArray(parsed)) throw new Error("input must be a JSON array");
      const rows: BatchRow[] = [];
      for (let i = 0; i < parsed.length; i++) {
        try {
          const body = await runOne(parsed[i] as Record<string, unknown>);
          rows.push({ index: i, ok: true, result: body });
        } catch (e) {
          rows.push({ index: i, ok: false, error: (e as Error).message });
        }
        setBatchRows([...rows]);
      }
    } catch (e) {
      setBatchErr((e as Error).message);
    } finally {
      setBatchRunning(false);
    }
  }

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Route Simulator
        </h1>
        <Link
          href={`/dashboard/routing/flows/${flowId}` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← flow editor
        </Link>
        <span style={{ fontSize: 11, color: "var(--fg-2)" }}>
          dry-run · no caps consumed · no push to broker
        </span>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["single", "batch"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{ ...btnStyle(theme, mode === m ? "primary" : undefined), fontSize: 12 }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "single" && (
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
              <LabeledInput
                label="GEO (ISO-3166-1 alpha-2)"
                value={form.geo}
                onChange={(v) => setForm({ ...form, geo: v.toUpperCase().slice(0, 2) })}
              />
              <LabeledInput
                label="Affiliate id"
                value={form.affiliate_id}
                onChange={(v) => setForm({ ...form, affiliate_id: v })}
              />
              <LabeledInput
                label="Sub id"
                value={form.sub_id}
                onChange={(v) => setForm({ ...form, sub_id: v })}
              />
              <LabeledInput
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <button
                type="button"
                style={btnStyle(theme, "primary")}
                disabled={running}
                onClick={runSingle}
              >
                {running ? "Simulating…" : "Run simulate"}
              </button>
              {err && <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>error: {err}</div>}
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
              <span>Execution trace</span>
              {result && (
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                  {result.decision_time_ms.toFixed(1)}ms
                </span>
              )}
            </div>
            <div style={{ padding: 14 }}>
              {!result && (
                <div style={{ color: "var(--fg-2)", fontSize: 12 }}>
                  Run a simulation to see the decision trace.
                </div>
              )}
              {result && <TraceView result={result} />}
            </div>
          </section>
        </div>
      )}

      {mode === "batch" && (
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16 }}>
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
              Batch payload (JSON array)
            </div>
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea
                value={batchJson}
                onChange={(e) => setBatchJson(e.target.value)}
                rows={14}
                style={{
                  width: "100%",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  padding: 8,
                  border: "1px solid var(--bd-1)",
                  background: "var(--bg-1)",
                  color: "var(--fg-0)",
                  borderRadius: 4,
                }}
              />
              <button
                type="button"
                style={btnStyle(theme, "primary")}
                disabled={batchRunning}
                onClick={runBatch}
              >
                {batchRunning ? "Running…" : "Run batch"}
              </button>
              {batchErr && (
                <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>error: {batchErr}</div>
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
              }}
            >
              Results ({batchRows.length})
            </div>
            <div style={{ padding: 0 }}>
              {batchRows.length === 0 ? (
                <div style={{ padding: 14, color: "var(--fg-2)", fontSize: 12 }}>
                  Paste a JSON array of lead payloads and click Run batch.
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
                      <th style={{ padding: "8px 14px" }}>#</th>
                      <th>outcome</th>
                      <th>algo</th>
                      <th>broker</th>
                      <th>reason</th>
                      <th>ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((r) => (
                      <tr key={r.index} style={{ borderTop: "1px solid var(--bd-1)" }}>
                        <td style={{ padding: "6px 14px", fontFamily: "var(--mono)" }}>
                          {r.index}
                        </td>
                        <td>
                          {r.ok ? (
                            <Pill tone={outcomeTone(r.result?.outcome ?? "error")} size="xs">
                              {r.result?.outcome}
                            </Pill>
                          ) : (
                            <Pill tone="danger" size="xs">
                              error
                            </Pill>
                          )}
                        </td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>
                          {r.result?.algorithm_used ?? "—"}
                        </td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>
                          {r.result?.selected_broker_id?.slice(0, 10) ?? "—"}
                        </td>
                        <td
                          style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}
                        >
                          {r.result?.reason ?? r.error ?? ""}
                        </td>
                        <td style={{ fontFamily: "var(--mono)" }}>
                          {r.result?.decision_time_ms.toFixed(1) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function TraceView({ result }: { result: SimulateResult }) {
  return (
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

      <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>Decision steps</div>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          borderLeft: "2px solid var(--bd-1)",
        }}
      >
        {result.filters_applied.map((s, i) => (
          <li
            key={`${s.step}-${s.node_id ?? i}`}
            style={{
              paddingLeft: 12,
              paddingBottom: 8,
              position: "relative",
              marginLeft: 4,
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: -5,
                top: 4,
                width: 8,
                height: 8,
                borderRadius: 8,
                background: s.ok ? "oklch(70% 0.15 150)" : "oklch(72% 0.15 25)",
              }}
            />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-0)" }}>
                {s.step}
              </span>
              {s.node_id && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                  [{s.node_id}]
                </span>
              )}
              <Pill tone={s.ok ? "success" : "warn"} size="xs">
                {s.ok ? "ok" : "fail"}
              </Pill>
            </div>
            {s.detail != null && (
              <div
                style={{
                  marginTop: 2,
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--fg-2)",
                }}
              >
                {typeof s.detail === "string" ? s.detail : JSON.stringify(s.detail)}
              </div>
            )}
          </li>
        ))}
      </ol>

      {result.fallback_path.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 14, marginBottom: 6 }}>
            Fallback path
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {result.fallback_path.map((f, i) => (
              <span
                key={`${f.from}-${f.to}-${i}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Pill size="xs">{f.from}</Pill>
                <span style={{ color: "var(--fg-2)", fontSize: 10 }}>→ {f.reason}</span>
                <Pill size="xs" tone="warn">
                  {f.to}
                </Pill>
              </span>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <CodeBlock label="raw explain" data={result} />
      </div>
    </>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: "var(--sans)",
          fontSize: 12,
          padding: "4px 8px",
          border: "1px solid var(--bd-1)",
          background: "var(--bg-1)",
          color: "var(--fg-0)",
          borderRadius: 3,
        }}
      />
    </label>
  );
}
