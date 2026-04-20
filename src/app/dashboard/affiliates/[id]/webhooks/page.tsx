"use client";
import { CodeBlock, Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

type Webhook = {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  pausedAt: string | null;
  pausedReason: string | null;
  createdAt: string;
};

type Delivery = {
  id: string;
  webhookId: string;
  eventType: string;
  signature: string | null;
  attempt: number;
  lastStatus: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

const ALL_EVENTS = ["intake.accepted", "intake.rejected", "intake.duplicate"] as const;

export default function IntakeWebhooksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    url: "",
    secret: "",
    events: ["intake.accepted", "intake.rejected"] as string[],
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    const [h, d] = await Promise.all([
      fetch(`/api/v1/affiliates/${id}/webhooks/intake`),
      fetch(`/api/v1/affiliates/${id}/webhooks/deliveries?limit=50`),
    ]);
    if (!h.ok) {
      setErr(`webhooks: ${(await h.json()).error?.code ?? "unknown"}`);
      return;
    }
    if (!d.ok) {
      setErr(`deliveries: ${(await d.json()).error?.code ?? "unknown"}`);
      return;
    }
    const hj = await h.json();
    const dj = await d.json();
    setHooks(hj.webhooks ?? []);
    setDeliveries(dj.deliveries ?? []);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  async function create() {
    setSaving(true);
    setErr(null);
    const r = await fetch(`/api/v1/affiliates/${id}/webhooks/intake`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: form.url,
        secret: form.secret,
        events: form.events,
      }),
    });
    if (!r.ok) {
      setErr(`create: ${(await r.json()).error?.code ?? r.status}`);
    } else {
      setForm({ url: "", secret: "", events: ["intake.accepted", "intake.rejected"] });
      await load();
    }
    setSaving(false);
  }

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Intake Webhooks
        </h1>
        <Link
          href={`/dashboard/affiliates/${id}` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← affiliate
        </Link>
        <Link
          href={`/dashboard/affiliates/${id}/intake-settings` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          intake settings →
        </Link>
      </div>

      {err && (
        <div style={{ color: "oklch(72% 0.15 25)", marginBottom: 10, fontSize: 12 }}>{err}</div>
      )}

      <div
        style={{
          border: "1px solid var(--bd-1)",
          borderRadius: 6,
          padding: 14,
          marginBottom: 18,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500 }}>Create webhook</div>
        <input
          placeholder="https://hooks.example.com/gambchamp"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          style={{ ...inputStyle(theme), width: "100%" }}
        />
        <input
          placeholder="shared secret (16-128 chars)"
          value={form.secret}
          onChange={(e) => setForm({ ...form, secret: e.target.value })}
          style={{ ...inputStyle(theme), width: "100%" }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ALL_EVENTS.map((e) => (
            <label key={e} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={form.events.includes(e)}
                onChange={(ev) => {
                  const on = ev.target.checked;
                  setForm({
                    ...form,
                    events: on ? [...form.events, e] : form.events.filter((x) => x !== e),
                  });
                }}
              />
              {e}
            </label>
          ))}
        </div>
        <div>
          <button
            type="button"
            style={btnStyle(theme, "primary")}
            disabled={saving || !form.url || form.secret.length < 16 || form.events.length === 0}
            onClick={create}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          Registered ({hooks.length})
        </div>
        {hooks.length === 0 && (
          <div style={{ color: "var(--fg-2)", fontSize: 12 }}>No webhooks configured.</div>
        )}
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
              <th style={{ padding: "6px 0" }}>url</th>
              <th>events</th>
              <th>status</th>
              <th>paused reason</th>
              <th>created</th>
            </tr>
          </thead>
          <tbody>
            {hooks.map((w) => (
              <tr key={w.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                <td
                  style={{
                    padding: "6px 0",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    maxWidth: 360,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {w.url}
                </td>
                <td style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 6 }}>
                  {w.events.map((e) => (
                    <Pill key={e} size="xs">
                      {e.replace("intake.", "")}
                    </Pill>
                  ))}
                </td>
                <td>
                  {w.pausedAt ? (
                    <Pill tone="danger" size="xs">
                      paused
                    </Pill>
                  ) : w.isActive ? (
                    <Pill tone="success" size="xs">
                      active
                    </Pill>
                  ) : (
                    <Pill size="xs">inactive</Pill>
                  )}
                </td>
                <td style={{ fontSize: 11, color: "var(--fg-2)" }}>{w.pausedReason ?? "—"}</td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                  {new Date(w.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          Recent deliveries ({deliveries.length})
        </div>
        <table style={{ width: "100%", fontSize: 11 }}>
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
              <th style={{ padding: "6px 0" }}>when</th>
              <th>event</th>
              <th>attempt</th>
              <th>status</th>
              <th>delivered</th>
              <th>next try</th>
              <th>error</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                <td style={{ padding: "6px 0", fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                  {new Date(d.createdAt).toLocaleString()}
                </td>
                <td>
                  <Pill size="xs">{d.eventType.replace("intake.", "")}</Pill>
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{d.attempt}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{d.lastStatus ?? "—"}</td>
                <td>
                  {d.deliveredAt ? (
                    <Pill tone="success" size="xs">
                      ok
                    </Pill>
                  ) : (
                    <Pill size="xs">pending</Pill>
                  )}
                </td>
                <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                  {d.nextAttemptAt ? new Date(d.nextAttemptAt).toLocaleTimeString() : "—"}
                </td>
                <td
                  style={{
                    fontFamily: "var(--mono)",
                    color: "oklch(72% 0.15 25)",
                    maxWidth: 260,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.lastError ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hooks.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <CodeBlock
            label="signature header format"
            data={{
              header: "X-GambChamp-Signature",
              value: "sha256=<hex>",
              payload: "HMAC-SHA256 of raw body using webhook secret",
              retry_schedule: ["10s", "60s", "300s", "900s", "3600s"],
              auto_pause: "HTTP 410 Gone pauses webhook automatically",
            }}
          />
        </div>
      )}
    </div>
  );
}
