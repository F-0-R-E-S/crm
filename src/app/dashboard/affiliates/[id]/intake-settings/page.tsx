"use client";
import { CodeBlock, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

type Settings = {
  required_fields: string[];
  allowed_geo: string[];
  dedupe_window_days: number;
  max_rpm: number;
  accept_schedule: Record<string, unknown>;
  version: number;
};

export default function IntakeSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const [data, setData] = useState<Settings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/v1/affiliates/${id}/intake-settings`);
    if (!r.ok) setErr((await r.json()).error?.code ?? "unknown");
    else setData(await r.json());
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!data) return;
    setSaving(true);
    setErr(null);
    const r = await fetch(`/api/v1/affiliates/${id}/intake-settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        required_fields: data.required_fields,
        allowed_geo: data.allowed_geo,
        dedupe_window_days: data.dedupe_window_days,
        max_rpm: data.max_rpm,
        accept_schedule: data.accept_schedule,
      }),
    });
    const body = await r.json();
    if (!r.ok) setErr(`${r.status}: ${body.error?.message ?? body.error?.code}`);
    else setData(body);
    setSaving(false);
  }

  return (
    <div style={{ padding: "20px 28px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Intake Settings
        </h1>
        <Link
          href={`/dashboard/affiliates/${id}` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← affiliate
        </Link>
        {data && <span style={{ fontSize: 11, color: "var(--fg-2)" }}>v{data.version}</span>}
      </div>

      {!data && !err && <div style={{ color: "var(--fg-2)" }}>loading…</div>}
      {err && <div style={{ color: "oklch(72% 0.15 25)" }}>{err}</div>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="Required fields (comma-separated)">
            <input
              value={data.required_fields.join(", ")}
              onChange={(e) =>
                setData({
                  ...data,
                  required_fields: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </Row>
          <Row label="Allowed geos (comma-separated ISO-2, empty = all)">
            <input
              value={data.allowed_geo.join(", ")}
              onChange={(e) =>
                setData({
                  ...data,
                  allowed_geo: e.target.value
                    .split(",")
                    .map((s) => s.trim().toUpperCase())
                    .filter((s) => s.length === 2),
                })
              }
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </Row>
          <Row label="Dedupe window (days, 1-90)">
            <input
              type="number"
              min={1}
              max={90}
              value={data.dedupe_window_days}
              onChange={(e) => setData({ ...data, dedupe_window_days: Number(e.target.value) })}
              style={{ ...inputStyle(theme), width: 120 }}
            />
          </Row>
          <Row label="Max RPM (10-2000)">
            <input
              type="number"
              min={10}
              max={2000}
              value={data.max_rpm}
              onChange={(e) => setData({ ...data, max_rpm: Number(e.target.value) })}
              style={{ ...inputStyle(theme), width: 120 }}
            />
          </Row>
          <Row label="Accept schedule (JSON)">
            <textarea
              rows={4}
              defaultValue={JSON.stringify(data.accept_schedule, null, 2)}
              onBlur={(e) => {
                try {
                  setData({ ...data, accept_schedule: JSON.parse(e.target.value) });
                } catch {
                  // ignore
                }
              }}
              style={{
                ...inputStyle(theme),
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: 11,
              }}
            />
          </Row>
          <div>
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <CodeBlock label="current state" data={data} />
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{label}</span>
      {children}
    </div>
  );
}
