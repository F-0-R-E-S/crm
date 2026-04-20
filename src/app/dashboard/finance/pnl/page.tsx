"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { FinanceFilterBar, type FinanceFilters } from "../_components/filter-bar";

export default function PnLPage() {
	const [filters, setFilters] = useState<FinanceFilters>(() => ({
		from: new Date(Date.now() - 30 * 24 * 3600_000),
		to: new Date(),
	}));
	const pnl = trpc.finance.pnl.useQuery(filters);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<header style={{ padding: "12px 16px 8px" }}>
				<h1 style={{ fontSize: 15, fontWeight: 600 }}>P&L</h1>
			</header>
			<FinanceFilterBar value={filters} onChange={setFilters} />
			{pnl.isLoading ? (
				<div style={{ padding: 24, fontSize: 13, opacity: 0.6 }}>Computing…</div>
			) : pnl.data ? (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(4, 1fr)",
						gap: 12,
						padding: 16,
					}}
				>
					<Tile label="Revenue" value={`$${pnl.data.revenue}`} />
					<Tile label="Payout" value={`$${pnl.data.payout}`} />
					<Tile label="Margin" value={`$${pnl.data.margin}`} />
					<Tile label="Margin %" value={`${pnl.data.marginPct.toFixed(1)}%`} />
					<BreakdownTable byKind={pnl.data.breakdown.byKind} />
				</div>
			) : null}
		</div>
	);
}

function Tile({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				borderRadius: 4,
				border: "1px solid var(--bd-1)",
				padding: 12,
			}}
		>
			<div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.6 }}>{label}</div>
			<div style={{ fontSize: 18, fontFamily: "var(--mono)", marginTop: 4 }}>{value}</div>
		</div>
	);
}

function BreakdownTable({
	byKind,
}: {
	byKind: Record<string, { count: number; revenue: string; payout: string }>;
}) {
	return (
		<div style={{ gridColumn: "span 4", marginTop: 12 }}>
			<table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
				<thead>
					<tr
						style={{
							textAlign: "left",
							fontSize: 10,
							textTransform: "uppercase",
							opacity: 0.6,
							borderBottom: "1px solid var(--bd-1)",
						}}
					>
						<th style={{ padding: "8px 0" }}>Kind</th>
						<th>Count</th>
						<th>Revenue</th>
						<th>Payout</th>
						<th>Margin</th>
					</tr>
				</thead>
				<tbody>
					{Object.entries(byKind).map(([k, v]) => {
						const margin = (
							Number.parseFloat(v.revenue) - Number.parseFloat(v.payout)
						).toFixed(2);
						return (
							<tr key={k} style={{ borderBottom: "1px solid var(--bd-1)" }}>
								<td style={{ padding: "8px 0", fontFamily: "var(--mono)" }}>{k}</td>
								<td>{v.count}</td>
								<td style={{ fontFamily: "var(--mono)" }}>${v.revenue}</td>
								<td style={{ fontFamily: "var(--mono)" }}>${v.payout}</td>
								<td style={{ fontFamily: "var(--mono)" }}>${margin}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
