"use client";
import { ConversionsWidget } from "@/components/analytics/ConversionsWidget";
import { LineChartCard } from "@/components/analytics/LineChartCard";
import { MetricTile } from "@/components/analytics/MetricTile";
import { RejectsWidget } from "@/components/analytics/RejectsWidget";

interface Props {
  query: unknown;
  proc: string;
  data: unknown;
  expiresAt: string;
}

function daysFromNow(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic rendering by proc name
function renderWidget(proc: string, data: any) {
  if (!data) return <EmptyState />;
  if (proc === "metricSeries") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <MetricTile
          label="Total"
          value={data.total ?? 0}
          deltaPct={data.deltaPct}
          series={data.series ?? []}
        />
        <LineChartCard
          title="Series"
          current={data.series ?? []}
          compare={data.compare?.series ?? null}
        />
      </div>
    );
  }
  if (proc === "conversionBreakdown") return <ConversionsWidget data={data} />;
  if (proc === "rejectBreakdown") return <RejectsWidget data={data} />;
  if (proc === "revenueBreakdown") {
    const rows = (data.rows ?? []) as Array<{
      bucket: string;
      revenue: number;
      ftds: number;
      pushed: number;
    }>;
    return (
      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 4,
          padding: 12,
          background: "white",
        }}
      >
        <div style={{ fontSize: 11, fontFamily: "monospace", marginBottom: 8, color: "#666" }}>
          Revenue breakdown
        </div>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>Bucket</th>
              <th style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>Revenue</th>
              <th style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>FTDs</th>
              <th style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>Pushed</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r) => (
              <tr key={r.bucket}>
                <td style={{ padding: "4px 8px" }}>{r.bucket}</td>
                <td style={{ padding: "4px 8px" }}>${r.revenue.toLocaleString()}</td>
                <td style={{ padding: "4px 8px" }}>{r.ftds}</td>
                <td style={{ padding: "4px 8px" }}>{r.pushed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <EmptyState />;
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 24,
        fontSize: 13,
        color: "#666",
        textAlign: "center",
        border: "1px dashed #ccc",
        borderRadius: 4,
      }}
    >
      No data for the shared view parameters.
    </div>
  );
}

export function SharedAnalyticsView({ query, proc, data, expiresAt }: Props) {
  const days = daysFromNow(expiresAt);
  const q = query as Record<string, unknown>;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        color: "#111",
        padding: "32px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderBottom: "1px solid #ddd",
            paddingBottom: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, margin: 0 }}>Shared analytics view</h1>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#888", marginTop: 4 }}>
              {proc} · {String(q.from ?? "")} → {String(q.to ?? "")}
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: days <= 3 ? "#c00" : "#666",
            }}
          >
            {days === 0 ? "expires today" : `expires in ${days}d`}
          </span>
        </header>
        {renderWidget(proc, data)}
        <footer style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 24 }}>
          Read-only shared view · powered by GambChamp CRM
        </footer>
      </div>
    </div>
  );
}
