"use client";
import { trpc } from "@/lib/trpc";
import type { FilterState } from "./FilterBar";

export type DrillDownKind = "metric" | "conversion" | "reject" | "revenue";

export type DrillDownQuery =
  | {
      kind: "metric";
      metric: "leads" | "ftds" | "accepted" | "revenue" | "acceptanceRate";
      bucket: string;
      groupBy: FilterState["groupBy"];
    }
  | {
      kind: "conversion";
      stage: "received" | "validated" | "pushed" | "accepted" | "ftd" | "rejected";
    }
  | { kind: "reject"; reason: string }
  | { kind: "revenue"; bucket?: string; groupBy?: FilterState["groupBy"] };

export interface DrillDownDrawerProps {
  query: DrillDownQuery | null;
  filters: Pick<FilterState, "from" | "to" | "filters">;
  onClose: () => void;
}

function titleFor(q: DrillDownQuery): string {
  if (q.kind === "metric") return `Leads in bucket (${q.metric} · ${q.bucket})`;
  if (q.kind === "conversion") return `Leads at stage: ${q.stage}`;
  if (q.kind === "reject") return `Rejects: ${q.reason}`;
  return `Revenue leads${q.bucket ? ` · ${q.bucket}` : ""}`;
}

export function DrillDownDrawer({ query, filters, onClose }: DrillDownDrawerProps) {
  const input = query ? { ...query, ...filters } : null;
  // biome-ignore lint/suspicious/noExplicitAny: union input shape is accepted by the server discriminator
  const rows = trpc.analytics.drillDown.useQuery(input as any, {
    enabled: query != null,
  });
  if (!query) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 520,
        background: "var(--bg-0, white)",
        borderLeft: "1px solid var(--bd-1)",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.14)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 40,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{titleFor(query)}</div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 11,
            background: "var(--bg-2)",
            cursor: "pointer",
          }}
        >
          close
        </button>
      </div>
      {rows.isLoading ? <div style={{ fontSize: 12, color: "var(--fg-2)" }}>Loading…</div> : null}
      {rows.error ? (
        <div style={{ fontSize: 12, color: "#c00" }}>Error: {rows.error.message}</div>
      ) : null}
      {rows.data ? (
        <>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
            {rows.data.total} total · showing {rows.data.items.length}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>state</th>
                <th style={thStyle}>geo</th>
                <th style={thStyle}>reject</th>
                <th style={thStyle}>created</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.items.map((l) => (
                <tr key={l.id}>
                  <td style={tdStyle}>
                    <a
                      href={`/dashboard/leads/${l.id}`}
                      style={{ color: "var(--accent)", textDecoration: "underline" }}
                    >
                      {l.externalId ?? l.id.slice(0, 8)}
                    </a>
                  </td>
                  <td style={tdStyle}>{l.state}</td>
                  <td style={tdStyle}>{l.geo}</td>
                  <td style={tdStyle}>{l.rejectReason ?? "—"}</td>
                  <td style={tdStyle}>
                    {l.createdAt instanceof Date
                      ? l.createdAt.toISOString().slice(0, 16).replace("T", " ")
                      : String(l.createdAt).slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.data.items.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--fg-2)", padding: 12, textAlign: "center" }}>
              No leads match this drill-down.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--bd-1)",
  padding: "4px 6px",
  fontFamily: "var(--mono)",
  fontSize: 10,
  color: "var(--fg-2)",
};

const tdStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderBottom: "1px solid var(--bd-1)",
};
