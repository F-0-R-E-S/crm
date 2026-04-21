"use client";
import { ConversionsWidget } from "@/components/analytics/ConversionsWidget";
import { DrillDownDrawer, type DrillDownQuery } from "@/components/analytics/DrillDownDrawer";
import { FilterBar, type FilterState } from "@/components/analytics/FilterBar";
import { LineChartCard } from "@/components/analytics/LineChartCard";
import { MetricTile } from "@/components/analytics/MetricTile";
import { PresetManager } from "@/components/analytics/PresetManager";
import { RejectsWidget } from "@/components/analytics/RejectsWidget";
import { RevenueWidget } from "@/components/analytics/RevenueWidget";
import { ShareDialog } from "@/components/analytics/ShareDialog";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";

function defaultFilters(): FilterState {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 7);
  from.setUTCHours(0, 0, 0, 0);
  return {
    from,
    to,
    groupBy: "day",
    compareTo: "previous_period",
    filters: { affiliateIds: [], brokerIds: [], geos: [] },
  };
}

function coerceFilterState(raw: unknown): FilterState | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.from || !obj.to) return null;
  try {
    return {
      from: new Date(obj.from as string | Date),
      to: new Date(obj.to as string | Date),
      groupBy: (obj.groupBy as FilterState["groupBy"]) ?? "day",
      compareTo: (obj.compareTo as FilterState["compareTo"]) ?? null,
      filters: (obj.filters as FilterState["filters"]) ?? {
        affiliateIds: [],
        brokerIds: [],
        geos: [],
      },
    };
  } catch {
    return null;
  }
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [drillDown, setDrillDown] = useState<DrillDownQuery | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const leads = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "leads" });
  const ftds = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "ftds" });
  const revenue = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "revenue" });
  const acceptance = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "acceptanceRate" });
  const conv = trpc.analytics.conversionBreakdown.useQuery(filters);
  const rej = trpc.analytics.rejectBreakdown.useQuery(filters);
  const rev = trpc.analytics.revenueBreakdown.useQuery(filters);
  const defaultPreset = trpc.analytics.getDefaultPreset.useQuery();

  // Auto-load default preset once on mount
  const loadedDefaultRef = useRef(false);
  useEffect(() => {
    if (loadedDefaultRef.current) return;
    if (defaultPreset.data && !defaultPreset.isLoading) {
      loadedDefaultRef.current = true;
      const next = coerceFilterState(defaultPreset.data.query);
      if (next) setFilters(next);
    } else if (defaultPreset.data === null && !defaultPreset.isLoading) {
      loadedDefaultRef.current = true;
    }
  }, [defaultPreset.data, defaultPreset.isLoading]);

  // Restore shared view ?share= token
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("share");
    if (!token) return;
    fetch(`/api/v1/analytics/share/${token}`)
      .then((r) => r.json())
      .then((d: { query?: unknown }) => {
        const next = coerceFilterState(d?.query);
        if (next) setFilters(next);
      })
      .catch(() => {});
  }, []);

  async function createShare(ttlDays: number): Promise<string | null> {
    const res = await fetch("/api/v1/analytics/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: { proc: "metricSeries", ...filters, metric: "leads" },
        ttlDays,
      }),
    });
    if (!res.ok) return null;
    const { token } = (await res.json()) as { token: string };
    return token;
  }

  return (
    <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Analytics
        </h1>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>v1.5</span>
        <div style={{ flex: 1 }} />
        <PresetManager
          currentQuery={filters}
          onApply={(q) => {
            const next = coerceFilterState(q);
            if (next) setFilters(next);
          }}
        />
        <button
          type="button"
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 12,
            background: "var(--accent, oklch(76% 0.12 220))",
            color: "var(--bg-0, #000)",
            cursor: "pointer",
          }}
          onClick={() => setShareOpen(true)}
        >
          share…
        </button>
      </header>
      <FilterBar value={filters} onChange={setFilters} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <MetricTile
          label="Leads"
          value={leads.data?.total ?? 0}
          deltaPct={leads.data?.deltaPct}
          series={leads.data?.series ?? []}
          onClick={() =>
            setDrillDown({
              kind: "metric",
              metric: "leads",
              bucket: filters.from.toISOString(),
              groupBy: filters.groupBy,
            })
          }
        />
        <MetricTile
          label="FTDs"
          value={ftds.data?.total ?? 0}
          deltaPct={ftds.data?.deltaPct}
          series={ftds.data?.series ?? []}
          onClick={() =>
            setDrillDown({
              kind: "metric",
              metric: "ftds",
              bucket: filters.from.toISOString(),
              groupBy: filters.groupBy,
            })
          }
        />
        <MetricTile
          label="Revenue"
          value={revenue.data?.total ?? 0}
          deltaPct={revenue.data?.deltaPct}
          series={revenue.data?.series ?? []}
          format="currency"
          onClick={() => setDrillDown({ kind: "revenue" })}
        />
        <MetricTile
          label="Acceptance rate"
          value={acceptance.data?.total ?? 0}
          deltaPct={acceptance.data?.deltaPct}
          series={acceptance.data?.series ?? []}
          format="percent"
          onClick={() =>
            setDrillDown({
              kind: "conversion",
              stage: "accepted",
            })
          }
        />
      </div>
      <LineChartCard
        title="Leads over time"
        current={leads.data?.series ?? []}
        compare={leads.data?.compare?.series ?? null}
        onPointClick={(bucket) =>
          setDrillDown({
            kind: "metric",
            metric: "leads",
            bucket,
            groupBy: filters.groupBy,
          })
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <ExportButton
            proc="conversionBreakdown"
            filters={filters}
            label="Download conversions CSV"
          />
          <ConversionsWidget
            data={conv.data}
            onStageClick={(stage) => setDrillDown({ kind: "conversion", stage })}
          />
        </div>
        <div>
          <ExportButton proc="rejectBreakdown" filters={filters} label="Download rejects CSV" />
          <RejectsWidget
            data={rej.data}
            onReasonClick={(reason) => setDrillDown({ kind: "reject", reason })}
          />
        </div>
      </div>
      <RevenueWidget
        data={rev.data}
        onBucketClick={(bucket) =>
          setDrillDown({ kind: "revenue", bucket, groupBy: filters.groupBy })
        }
      />
      <div>
        <ExportButton proc="metricSeries" filters={filters} label="Download leads series CSV" />
      </div>
      <DrillDownDrawer
        query={drillDown}
        filters={{ from: filters.from, to: filters.to, filters: filters.filters }}
        onClose={() => setDrillDown(null)}
      />
      {shareOpen ? (
        <ShareDialog onClose={() => setShareOpen(false)} onCreateShare={createShare} />
      ) : null}
    </div>
  );
}

function ExportButton({
  proc,
  filters,
  label,
}: {
  proc: string;
  filters: FilterState;
  label: string;
}) {
  const href = `/api/v1/analytics/export?query=${encodeURIComponent(
    JSON.stringify({ proc, ...filters, metric: "leads" }),
  )}`;
  return (
    <a
      href={href}
      style={{
        fontSize: 11,
        fontFamily: "var(--mono)",
        color: "var(--fg-2)",
        textDecoration: "underline",
      }}
    >
      {label}
    </a>
  );
}
