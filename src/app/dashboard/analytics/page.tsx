"use client";
import { ConversionsWidget } from "@/components/analytics/ConversionsWidget";
import { FilterBar, type FilterState } from "@/components/analytics/FilterBar";
import { LineChartCard } from "@/components/analytics/LineChartCard";
import { MetricTile } from "@/components/analytics/MetricTile";
import { RejectsWidget } from "@/components/analytics/RejectsWidget";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

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

export default function AnalyticsPage() {
	const [filters, setFilters] = useState<FilterState>(defaultFilters);
	const leads = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "leads" });
	const ftds = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "ftds" });
	const revenue = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "revenue" });
	const acceptance = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "acceptanceRate" });
	const conv = trpc.analytics.conversionBreakdown.useQuery(filters);
	const rej = trpc.analytics.rejectBreakdown.useQuery(filters);

	return (
		<div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
			<header style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
				<h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
					Analytics
				</h1>
				<span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
					v1
				</span>
			</header>
			<FilterBar value={filters} onChange={setFilters} />
			<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
				<MetricTile
					label="Leads"
					value={leads.data?.total ?? 0}
					deltaPct={leads.data?.deltaPct}
					series={leads.data?.series ?? []}
				/>
				<MetricTile
					label="FTDs"
					value={ftds.data?.total ?? 0}
					deltaPct={ftds.data?.deltaPct}
					series={ftds.data?.series ?? []}
				/>
				<MetricTile
					label="Revenue"
					value={revenue.data?.total ?? 0}
					deltaPct={revenue.data?.deltaPct}
					series={revenue.data?.series ?? []}
					format="currency"
				/>
				<MetricTile
					label="Acceptance rate"
					value={acceptance.data?.total ?? 0}
					deltaPct={acceptance.data?.deltaPct}
					series={acceptance.data?.series ?? []}
					format="percent"
				/>
			</div>
			<LineChartCard
				title="Leads over time"
				current={leads.data?.series ?? []}
				compare={leads.data?.compare?.series ?? null}
			/>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
				<ConversionsWidget data={conv.data} />
				<RejectsWidget data={rej.data} />
			</div>
		</div>
	);
}
