"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function AuditPage() {
  const { theme } = useThemeCtx();
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const { data } = trpc.audit.list.useQuery({ page, entity: entity || undefined });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        Audit log
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          placeholder="Entity (e.g. Broker, Affiliate, Lead)"
          style={{ ...inputStyle(theme), width: 280 }}
        />
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
            <th style={{ padding: "8px 0" }}>when</th>
            <th>user</th>
            <th>action</th>
            <th>entity</th>
            <th>diff</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid var(--bd-1)", verticalAlign: "top" }}>
              <td
                style={{
                  padding: "8px 0",
                  fontFamily: "var(--mono)",
                  color: "var(--fg-2)",
                  fontSize: 11,
                }}
              >
                {new Date(r.createdAt).toLocaleString()}
              </td>
              <td>{r.user.email}</td>
              <td>
                <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{r.action}</code>
              </td>
              <td>
                <Pill size="xs">{r.entity}</Pill>
                {r.entityId && (
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      color: "var(--fg-2)",
                      fontSize: 10,
                      marginLeft: 6,
                    }}
                  >
                    {r.entityId.slice(0, 6)}…
                  </span>
                )}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                  style={{ ...btnStyle(theme), padding: "2px 8px", fontSize: 10 }}
                >
                  {expanded[r.id] ? "hide" : "show"}
                </button>
                {expanded[r.id] && (
                  <pre
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--mono)",
                      color: "var(--fg-2)",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--bd-1)",
                      borderRadius: 4,
                      padding: 8,
                      marginTop: 6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(r.diff, null, 2)}
                  </pre>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          style={{ ...btnStyle(theme), opacity: page <= 1 ? 0.4 : 1 }}
        >
          Prev
        </button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-2)" }}>
          Page {page}
        </span>
        <button
          type="button"
          disabled={(data?.items.length ?? 0) < 50}
          onClick={() => setPage((p) => p + 1)}
          style={{ ...btnStyle(theme), opacity: (data?.items.length ?? 0) < 50 ? 0.4 : 1 }}
        >
          Next
        </button>
        <span
          style={{ marginLeft: 16, fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-2)" }}
        >
          {data?.total ?? 0} total
        </span>
      </div>
    </div>
  );
}
