"use client";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export interface MetricTileProps {
	label: string;
	value: number;
	deltaPct?: number | null;
	series: Array<{ bucket: string; value: number }>;
	format?: "number" | "currency" | "percent";
}

function formatValue(v: number, fmt: MetricTileProps["format"] = "number"): string {
	if (fmt === "currency") return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
	if (fmt === "percent") return `${(v * 100).toFixed(1)}%`;
	return v.toLocaleString();
}

export function MetricTile({ label, value, deltaPct, series, format = "number" }: MetricTileProps) {
	const deltaColor =
		deltaPct == null ? "var(--fg-2)" : deltaPct >= 0 ? "oklch(72% 0.17 145)" : "oklch(63% 0.22 25)";
	return (
		<div
			style={{
				border: "1px solid var(--bd-1)",
				borderRadius: 4,
				padding: 12,
				display: "flex",
				flexDirection: "column",
				gap: 4,
				background: "var(--bg-2)",
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontFamily: "var(--mono)",
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					color: "var(--fg-2)",
				}}
			>
				{label}
			</div>
			<div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
				<span style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
					{formatValue(value, format)}
				</span>
				{deltaPct != null ? (
					<span
						style={{
							fontSize: 11,
							fontFamily: "var(--mono)",
							color: deltaColor,
						}}
					>
						{deltaPct >= 0 ? "+" : ""}
						{deltaPct.toFixed(1)}%
					</span>
				) : null}
			</div>
			<div style={{ height: 40 }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={series}>
						<Line
							dataKey="value"
							stroke="currentColor"
							strokeWidth={1.5}
							dot={false}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
