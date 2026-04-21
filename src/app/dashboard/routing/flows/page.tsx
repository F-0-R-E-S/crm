"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState } from "react";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "ALL";

function statusTone(s: string) {
  if (s === "PUBLISHED") return "success" as const;
  if (s === "ARCHIVED") return "neutral" as const;
  return "warn" as const;
}

export default function FlowsListPage() {
  const { theme } = useThemeCtx();
  const [status, setStatus] = useState<Status>("ALL");
  const { data, isLoading } = trpc.routing.list.useQuery(status === "ALL" ? undefined : { status });

  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Routing Flows
        </h1>
        <Link
          href={"/dashboard/routing" as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← overview
        </Link>
        <span style={{ fontSize: 11, color: "var(--fg-2)", marginLeft: "auto" }}>
          {data?.length ?? 0} flows
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            style={{
              ...btnStyle(theme, status === s ? "primary" : undefined),
              fontSize: 11,
            }}
          >
            {s.toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ color: "var(--fg-2)" }}>loading…</div>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div
          style={{
            border: "1px dashed var(--bd-1)",
            padding: 24,
            borderRadius: 6,
            color: "var(--fg-2)",
            textAlign: "center",
          }}
        >
          No flows yet. Auto-migration creates <code>auto:&lt;GEO&gt;</code> flows on first push.
        </div>
      )}

      <div style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
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
              <th style={{ padding: "10px 14px" }}>name</th>
              <th>status</th>
              <th>timezone</th>
              <th>versions</th>
              <th>active version</th>
              <th>updated</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((f) => (
              <tr key={f.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                <td style={{ padding: "10px 14px" }}>
                  <Link
                    href={`/dashboard/routing/flows/${f.id}` as never}
                    style={{ color: "var(--fg-0)", textDecoration: "none", fontWeight: 500 }}
                  >
                    {f.name}
                  </Link>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                    {f.id.slice(0, 10)}
                  </div>
                </td>
                <td>
                  <Pill tone={statusTone(f.status)} size="xs">
                    {f.status.toLowerCase()}
                  </Pill>
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{f.timezone}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{f.versions?.length ?? 0}</td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                  {f.activeVersionId ? f.activeVersionId.slice(0, 10) : "—"}
                </td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                  {new Date(f.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
