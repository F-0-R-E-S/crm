"use client";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ConversionsWidgetProps {
	data?: {
		stages: {
			received: number;
			validated: number;
			rejected?: number;
			pushed: number;
			accepted: number;
			declined?: number;
			ftd: number;
		};
	};
}

const COLORS = ["#60a5fa", "#93c5fd", "#a78bfa", "#34d399", "#22c55e"];

export function ConversionsWidget({ data }: ConversionsWidgetProps) {
	const s = data?.stages ?? { received: 0, validated: 0, pushed: 0, accepted: 0, ftd: 0 };
	const rows = [
		{ name: "Received", value: s.received },
		{ name: "Validated", value: s.validated },
		{ name: "Pushed", value: s.pushed },
		{ name: "Accepted", value: s.accepted },
		{ name: "FTD", value: s.ftd },
	];

	return (
		<div
			style={{
				border: "1px solid var(--bd-1)",
				borderRadius: 4,
				padding: 12,
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
					marginBottom: 6,
				}}
			>
				Conversion funnel
			</div>
			<div style={{ height: 240 }}>
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={rows} layout="vertical">
						<XAxis type="number" hide />
						<YAxis dataKey="name" type="category" width={80} fontSize={11} />
						<Tooltip />
						<Bar dataKey="value" isAnimationActive={false}>
							{rows.map((_r, i) => (
								<Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
