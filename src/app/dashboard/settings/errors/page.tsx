"use client";
import { Pill, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { useEffect, useMemo, useState } from "react";

type ErrorEntry = {
  error_code: string;
  http_status: number;
  description: string;
  fix_hint: string;
};

function toneForStatus(s: number): "success" | "danger" | undefined {
  if (s >= 500) return "danger";
  if (s >= 400) return undefined;
  return "success";
}

export default function ErrorCatalogPage() {
  const { theme } = useThemeCtx();
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "4xx" | "5xx">("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/v1/errors");
      if (!r.ok) {
        setErr(`http ${r.status}`);
        return;
      }
      const body = await r.json();
      setErrors(body.errors ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return errors.filter((e) => {
      if (statusFilter === "4xx" && !(e.http_status >= 400 && e.http_status < 500)) return false;
      if (statusFilter === "5xx" && !(e.http_status >= 500)) return false;
      if (!qq) return true;
      return (
        e.error_code.toLowerCase().includes(qq) ||
        e.description.toLowerCase().includes(qq) ||
        e.fix_hint.toLowerCase().includes(qq)
      );
    });
  }, [errors, q, statusFilter]);

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
          Error Catalog
        </h1>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
          {filtered.length} / {errors.length}
        </span>
      </div>

      {err && <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          placeholder="search code / description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...inputStyle(theme), flex: 1 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "4xx" | "5xx")}
          style={{ ...inputStyle(theme), width: 120 }}
        >
          <option value="">all</option>
          <option value="4xx">4xx</option>
          <option value="5xx">5xx</option>
        </select>
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
            <th style={{ padding: "6px 0" }}>code</th>
            <th>status</th>
            <th>description</th>
            <th>fix hint</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={e.error_code} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td
                style={{
                  padding: "8px 12px 8px 0",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: "var(--fg-0)",
                }}
              >
                {e.error_code}
              </td>
              <td>
                <Pill size="xs" tone={toneForStatus(e.http_status)}>
                  {e.http_status}
                </Pill>
              </td>
              <td style={{ padding: "8px 0", color: "var(--fg-1)" }}>{e.description}</td>
              <td style={{ padding: "8px 0", fontSize: 11, color: "var(--fg-2)" }}>{e.fix_hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
