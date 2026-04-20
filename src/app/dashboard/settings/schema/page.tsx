"use client";
import { CodeBlock, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { useEffect, useState } from "react";

type SchemaResponse = {
  version: string;
  schema: Record<string, unknown>;
  example: Record<string, unknown>;
};

const VERSIONS = ["2026-01"];

export default function SchemaBrowserPage() {
  const { theme } = useThemeCtx();
  const [version, setVersion] = useState(VERSIONS[0]);
  const [data, setData] = useState<SchemaResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const r = await fetch(`/api/v1/schema/leads?version=${version}`);
      const body = await r.json();
      if (!r.ok) {
        setErr(body.error?.code ?? `http ${r.status}`);
      } else {
        setData(body);
      }
      setLoading(false);
    })();
  }, [version]);

  const props: Record<string, unknown> =
    (data?.schema &&
      ((data.schema as { definitions?: Record<string, { properties?: Record<string, unknown> }> })
        .definitions?.[`IntakeLead_${version}`]?.properties ??
        (data.schema as { properties?: Record<string, unknown> }).properties)) ??
    {};
  const required: string[] = ((
    data?.schema as { definitions?: Record<string, { required?: string[] }> }
  )?.definitions?.[`IntakeLead_${version}`]?.required ??
    (data?.schema as { required?: string[] } | undefined)?.required ??
    []) as string[];

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Intake Schema
        </h1>
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          style={{ ...inputStyle(theme), width: 140 }}
        >
          {VERSIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={{ color: "var(--fg-2)", fontSize: 12 }}>loading…</div>}
      {err && <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>{err}</div>}

      {data && (
        <>
          <div
            style={{
              border: "1px solid var(--bd-1)",
              borderRadius: 6,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-2)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Fields
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
                  <th style={{ padding: "6px 0" }}>field</th>
                  <th>type</th>
                  <th>required</th>
                  <th>notes</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(props).map(([field, schema]) => {
                  const s = schema as Record<string, unknown>;
                  const type =
                    (s.type as string) ??
                    (Array.isArray(s.anyOf) ? "union" : s.$ref ? "ref" : "any");
                  const fmt = s.format ? ` · ${s.format}` : "";
                  const enumVals = Array.isArray(s.enum) ? ` · [${s.enum.join(", ")}]` : "";
                  const isReq = required.includes(field);
                  return (
                    <tr key={field} style={{ borderTop: "1px solid var(--bd-1)" }}>
                      <td style={{ padding: "6px 0", fontFamily: "var(--mono)" }}>{field}</td>
                      <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                        {String(type)}
                        {fmt}
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{isReq ? "yes" : "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--fg-2)" }}>
                        {(s.description as string) ?? ""}
                        {enumVals}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <CodeBlock label="example payload" data={data.example} />
            <CodeBlock label="json schema" data={data.schema} />
          </div>
        </>
      )}
    </div>
  );
}
