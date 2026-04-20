"use client";
import { ConversionsWidget } from "@/components/analytics/ConversionsWidget";
import { FilterBar, type FilterState, type PresetRef } from "@/components/analytics/FilterBar";
import { LineChartCard } from "@/components/analytics/LineChartCard";
import { MetricTile } from "@/components/analytics/MetricTile";
import { RejectsWidget } from "@/components/analytics/RejectsWidget";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

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
	const utils = trpc.useUtils();
	const leads = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "leads" });
	const ftds = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "ftds" });
	const revenue = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "revenue" });
	const acceptance = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "acceptanceRate" });
	const conv = trpc.analytics.conversionBreakdown.useQuery(filters);
	const rej = trpc.analytics.rejectBreakdown.useQuery(filters);
	const presetsQuery = trpc.analytics.listPresets.useQuery();
	const savePreset = trpc.analytics.savePreset.useMutation({
		onSuccess: () => utils.analytics.listPresets.invalidate(),
	});

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

	async function handleShare() {
		const res = await fetch("/api/v1/analytics/share", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				query: { proc: "metricSeries", ...filters, metric: "leads" },
			}),
		});
		if (!res.ok) return;
		const { token } = (await res.json()) as { token: string };
		const url = `${window.location.origin}/dashboard/analytics?share=${token}`;
		try {
			await navigator.clipboard.writeText(url);
			alert(`Share URL copied:\n${url}`);
		} catch {
			alert(`Share URL:\n${url}`);
		}
	}

	const presets: PresetRef[] = (presetsQuery.data ?? []).map((p) => ({
		id: p.id,
		name: p.name,
		query: p.query,
	}));

	return (
		<div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
			<header style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
				<h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
					Analytics
				</h1>
				<span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>v1</span>
			</header>
			<FilterBar
				value={filters}
				onChange={setFilters}
				onShare={handleShare}
				onSavePreset={(name) => savePreset.mutateAsync({ name, query: filters })}
				presets={presets}
				onLoadPreset={(id) => {
					const p = presets.find((x) => x.id === id);
					if (p) {
						const next = coerceFilterState(p.query);
						if (next) setFilters(next);
					}
				}}
			/>
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
				<div>
					<ExportButton proc="conversionBreakdown" filters={filters} label="Download conversions CSV" />
					<ConversionsWidget data={conv.data} />
				</div>
				<div>
					<ExportButton proc="rejectBreakdown" filters={filters} label="Download rejects CSV" />
					<RejectsWidget data={rej.data} />
				</div>
			</div>
			<div>
				<ExportButton proc="metricSeries" filters={filters} label="Download leads series CSV" />
			</div>
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
