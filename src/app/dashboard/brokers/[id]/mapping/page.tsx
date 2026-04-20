"use client";
import { CodeBlock, Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type Rule = {
  target: string;
  transform?: "concat" | "format_phone" | "default" | "uppercase" | "lowercase";
  concatWith?: string;
  sep?: string;
  defaultValue?: string | number | boolean;
};
type Mapping = Record<string, Rule>;
type Static = Record<string, unknown>;

export default function MappingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const [mapping, setMapping] = useState<Mapping>({});
  const [staticPayload, setStaticPayload] = useState<Static>({});
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  async function load(withPreview = true) {
    const url = `/api/v1/brokers/${id}/mapping${withPreview ? "?preview=1" : ""}`;
    const r = await fetch(url);
    if (!r.ok) {
      setErr(`${r.status}: ${(await r.json()).error?.code ?? "unknown"}`);
      return;
    }
    const body = await r.json();
    setMapping((body.mapping ?? {}) as Mapping);
    setStaticPayload((body.static_payload ?? {}) as Static);
    setRequiredFields(body.required_fields ?? []);
    setPreview(body.preview ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    setSaving(true);
    setErr(null);
    setMissing([]);
    try {
      const r = await fetch(`/api/v1/brokers/${id}/mapping`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapping, staticPayload }),
      });
      const body = await r.json();
      if (r.status === 422 && body.error?.code === "required_field_missing") {
        setMissing(body.error.missing ?? []);
        setErr("Required fields missing");
      } else if (!r.ok) {
        setErr(`${r.status}: ${body.error?.code ?? "unknown"}`);
      } else {
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  function addRow() {
    const key = `new_${Object.keys(mapping).length + 1}`;
    setMapping({ ...mapping, [key]: { target: "" } });
  }

  function removeRow(src: string) {
    const m = { ...mapping };
    delete m[src];
    setMapping(m);
  }

  function updateRow(src: string, patch: Partial<Rule>, renameTo?: string) {
    if (renameTo && renameTo !== src) {
      const m: Mapping = {};
      for (const [k, v] of Object.entries(mapping)) {
        m[k === src ? renameTo : k] = { ...v, ...(k === src ? patch : {}) };
      }
      setMapping(m);
    } else {
      setMapping({ ...mapping, [src]: { ...mapping[src], ...patch } });
    }
  }

  const rows = Object.entries(mapping);
  const targetCovered = new Set(rows.map(([, r]) => r.target));

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Field Mapping
        </h1>
        <Link
          href={`/dashboard/brokers/${id}` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← back to broker
        </Link>
      </div>

      {requiredFields.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "var(--fg-2)", marginRight: 8 }}>
            Required targets:
          </span>
          {requiredFields.map((f) => (
            <Pill
              key={f}
              size="xs"
              tone={targetCovered.has(f) ? "success" : missing.includes(f) ? "danger" : "warn"}
            >
              {f}
            </Pill>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        {/* Left: mapping table */}
        <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>lead field → broker field</span>
            <button type="button" style={btnStyle(theme)} onClick={addRow}>
              + add row
            </button>
          </div>
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
                <th style={{ padding: "8px 14px" }}>lead field</th>
                <th>→ target</th>
                <th>transform</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: 28, color: "var(--fg-2)", textAlign: "center" }}
                  >
                    No mappings yet. Click "+ add row".
                  </td>
                </tr>
              )}
              {rows.map(([src, rule]) => (
                <tr key={src} style={{ borderTop: "1px solid var(--bd-1)" }}>
                  <td style={{ padding: "8px 14px" }}>
                    <input
                      defaultValue={src}
                      onBlur={(e) => updateRow(src, {}, e.target.value)}
                      style={{ ...inputStyle(theme), width: "100%", fontFamily: "var(--mono)" }}
                    />
                  </td>
                  <td>
                    <input
                      value={rule.target}
                      onChange={(e) => updateRow(src, { target: e.target.value })}
                      style={{ ...inputStyle(theme), width: "100%", fontFamily: "var(--mono)" }}
                    />
                  </td>
                  <td>
                    <select
                      value={rule.transform ?? ""}
                      onChange={(e) =>
                        updateRow(src, {
                          transform:
                            e.target.value === "" ? undefined : (e.target.value as Rule["transform"]),
                        })
                      }
                      style={{ ...inputStyle(theme), width: "100%" }}
                    >
                      <option value="">—</option>
                      <option value="concat">concat</option>
                      <option value="format_phone">format_phone</option>
                      <option value="default">default</option>
                      <option value="uppercase">uppercase</option>
                      <option value="lowercase">lowercase</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      style={{ ...btnStyle(theme), color: "oklch(72% 0.15 25)" }}
                      onClick={() => removeRow(src)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : "Save + reload preview"}
            </button>
            {err && <span style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>{err}</span>}
          </div>
        </section>

        {/* Right: preview */}
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
            Preview (PII masked)
          </div>
          <div style={{ padding: 14 }}>
            {preview ? (
              <CodeBlock label="outgoing payload" data={preview} />
            ) : (
              <div style={{ color: "var(--fg-2)" }}>Save to see preview.</div>
            )}
          </div>
          <div style={{ padding: 14, borderTop: "1px solid var(--bd-1)" }}>
            <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>
              Static payload (JSON)
            </div>
            <textarea
              rows={6}
              defaultValue={JSON.stringify(staticPayload, null, 2)}
              onBlur={(e) => {
                try {
                  setStaticPayload(JSON.parse(e.target.value));
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
          </div>
        </section>
      </div>
    </div>
  );
}
