"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type CohortStatus = "PENDING" | "MET" | "SHORTFALL";

export default function CrgCohortsPage() {
	const [brokerId, setBrokerId] = useState<string | undefined>(undefined);
	const brokers = trpc.broker.list.useQuery();
	const cohorts = trpc.finance.listCrgCohorts.useQuery({ brokerId });

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<header
				style={{
					padding: "12px 16px 8px",
					display: "flex",
					alignItems: "center",
					gap: 12,
				}}
			>
				<h1 style={{ fontSize: 15, fontWeight: 600 }}>CRG Cohorts</h1>
				<select
					value={brokerId ?? ""}
					onChange={(e) => setBrokerId(e.target.value || undefined)}
					style={{
						border: "1px solid var(--bd-1)",
						borderRadius: 3,
						padding: "4px 8px",
						fontSize: 12,
						background: "transparent",
						color: "var(--fg-0)",
					}}
				>
					<option value="">All brokers</option>
					{brokers.data?.map((b) => (
						<option key={b.id} value={b.id}>
							{b.name}
						</option>
					))}
				</select>
			</header>
			<div style={{ flex: 1, overflow: "auto" }}>
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
							<th style={{ padding: "8px 0 8px 16px" }}>Broker</th>
							<th>Period</th>
							<th>Size</th>
							<th>FTD</th>
							<th>Rate</th>
							<th>Guaranteed</th>
							<th>Status</th>
							<th>Shortfall</th>
						</tr>
					</thead>
					<tbody>
						{cohorts.data?.map((c) => (
							<tr key={c.id} style={{ borderBottom: "1px solid var(--bd-1)" }}>
								<td
									style={{
										padding: "8px 0 8px 16px",
										fontFamily: "var(--mono)",
									}}
								>
									{c.brokerId.slice(0, 8)}
								</td>
								<td style={{ fontFamily: "var(--mono)" }}>
									{new Date(c.cohortStart).toISOString().slice(0, 10)}
								</td>
								<td>{c.cohortSize}</td>
								<td>{c.ftdCount}</td>
								<td style={{ fontFamily: "var(--mono)" }}>
									{c.ftdRate ? `${(Number(c.ftdRate) * 100).toFixed(1)}%` : "—"}
								</td>
								<td style={{ fontFamily: "var(--mono)" }}>
									{c.guaranteedRate
										? `${(Number(c.guaranteedRate) * 100).toFixed(1)}%`
										: "—"}
								</td>
								<td>
									<StatusPill status={c.status as CohortStatus} />
								</td>
								<td style={{ fontFamily: "var(--mono)" }}>
									{c.shortfallAmount ? `$${c.shortfallAmount.toString()}` : "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{cohorts.data && cohorts.data.length === 0 ? (
					<div style={{ padding: 24, fontSize: 13, opacity: 0.6 }}>No cohorts.</div>
				) : null}
			</div>
		</div>
	);
}

function StatusPill({ status }: { status: CohortStatus }) {
	const tone: Record<CohortStatus, { bg: string }> = {
		PENDING: { bg: "rgba(255,255,255,0.08)" },
		MET: { bg: "rgba(70,180,100,0.18)" },
		SHORTFALL: { bg: "rgba(220,80,80,0.22)" },
	};
	return (
		<span
			style={{
				padding: "2px 8px",
				borderRadius: 3,
				fontSize: 10,
				fontFamily: "var(--mono)",
				textTransform: "uppercase",
				background: tone[status].bg,
				color: "var(--fg-0)",
			}}
		>
			{status}
		</span>
	);
}
