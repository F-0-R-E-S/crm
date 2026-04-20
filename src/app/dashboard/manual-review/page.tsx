"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

const REASONS = [
	"ALL",
	"BROKER_FAILED",
	"CAP_REACHED",
	"NO_BROKER_MATCH",
	"FRAUD_BORDERLINE",
] as const;
const STATUSES = ["OPEN", "CLAIMED", "RESOLVED", "ALL"] as const;

export default function ManualReviewPage() {
	const [status, setStatus] = useState<(typeof STATUSES)[number]>("OPEN");
	const [reason, setReason] = useState<(typeof REASONS)[number]>("ALL");
	const utils = trpc.useUtils();
	const list = trpc.manualReview.list.useQuery({
		status,
		reason: reason === "ALL" ? undefined : reason,
		cursor: null,
		take: 50,
	});
	const claim = trpc.manualReview.claim.useMutation({
		onSuccess: () => utils.manualReview.list.invalidate(),
	});
	const resolve = trpc.manualReview.resolve.useMutation({
		onSuccess: () => utils.manualReview.list.invalidate(),
	});
	const requeue = trpc.manualReview.requeue.useMutation({
		onSuccess: () => utils.manualReview.list.invalidate(),
	});

	const bd = "var(--bd-1)";
	const fg = "var(--fg-1)";
	const fgStrong = "var(--fg-0)";
	const bg = "var(--bg-1)";

	return (
		<div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
			<header style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
				<h1 style={{ fontSize: 20, fontWeight: 600, color: fgStrong, margin: 0 }}>
					Manual Review Queue
				</h1>
				<span style={{ fontSize: 11, fontFamily: "var(--mono)", color: fg }}>
					{list.data?.rows.length ?? 0} entries
				</span>
			</header>

			<div style={{ display: "flex", gap: 8 }}>
				<select
					value={status}
					onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
					style={{
						background: bg,
						color: fgStrong,
						border: `1px solid ${bd}`,
						borderRadius: 4,
						padding: "4px 8px",
						fontSize: 13,
					}}
				>
					{STATUSES.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
				<select
					value={reason}
					onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
					style={{
						background: bg,
						color: fgStrong,
						border: `1px solid ${bd}`,
						borderRadius: 4,
						padding: "4px 8px",
						fontSize: 13,
					}}
				>
					{REASONS.map((r) => (
						<option key={r} value={r}>
							{r}
						</option>
					))}
				</select>
			</div>

			<table
				style={{
					width: "100%",
					borderCollapse: "collapse",
					fontSize: 13,
					border: `1px solid ${bd}`,
				}}
			>
				<thead>
					<tr style={{ background: "var(--bg-2)", color: fg }}>
						<th style={{ textAlign: "left", padding: 8, fontWeight: 500 }}>Lead</th>
						<th style={{ textAlign: "left", padding: 8, fontWeight: 500 }}>Reason</th>
						<th style={{ textAlign: "left", padding: 8, fontWeight: 500 }}>Affiliate</th>
						<th style={{ textAlign: "left", padding: 8, fontWeight: 500 }}>Last broker</th>
						<th style={{ textAlign: "left", padding: 8, fontWeight: 500 }}>Age</th>
						<th style={{ textAlign: "left", padding: 8, fontWeight: 500 }}>Actions</th>
					</tr>
				</thead>
				<tbody>
					{list.data?.rows.map((r) => {
						const ageMs = Date.now() - new Date(r.createdAt).getTime();
						const ageMin = Math.round(ageMs / 60_000);
						const row = r as typeof r & {
							lead?: { traceId?: string; affiliate?: { name?: string } };
							lastBroker?: { name?: string };
						};
						return (
							<tr key={r.id} style={{ borderTop: `1px solid ${bd}`, color: fgStrong }}>
								<td style={{ padding: 8, fontFamily: "var(--mono)", fontSize: 11 }}>
									{row.lead?.traceId ?? r.leadId}
								</td>
								<td style={{ padding: 8 }}>{r.reason}</td>
								<td style={{ padding: 8 }}>{row.lead?.affiliate?.name ?? "-"}</td>
								<td style={{ padding: 8 }}>{row.lastBroker?.name ?? "-"}</td>
								<td style={{ padding: 8 }}>{ageMin}m</td>
								<td style={{ padding: 8, display: "flex", gap: 4 }}>
									{!r.claimedBy && (
										<button
											type="button"
											onClick={() => claim.mutate({ id: r.id })}
											style={actionButtonStyle(bd, fgStrong)}
										>
											Assign me
										</button>
									)}
									{!r.resolvedAt && (
										<>
											<button
												type="button"
												onClick={() => resolve.mutate({ id: r.id, resolution: "ACCEPT" })}
												style={{ ...actionButtonStyle(bd, fgStrong), color: "var(--accent-green, #3fb950)" }}
											>
												Accept
											</button>
											<button
												type="button"
												onClick={() => resolve.mutate({ id: r.id, resolution: "REJECT" })}
												style={{ ...actionButtonStyle(bd, fgStrong), color: "var(--accent-red, #f85149)" }}
											>
												Reject
											</button>
											<button
												type="button"
												onClick={() => requeue.mutate({ id: r.id })}
												style={{ ...actionButtonStyle(bd, fgStrong), color: "var(--accent-amber, #d29922)" }}
											>
												Requeue
											</button>
										</>
									)}
								</td>
							</tr>
						);
					})}
					{list.data?.rows.length === 0 && (
						<tr>
							<td
								colSpan={6}
								style={{ padding: 16, textAlign: "center", color: fg, fontStyle: "italic" }}
							>
								No entries.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function actionButtonStyle(bd: string, fg: string) {
	return {
		padding: "4px 8px",
		fontSize: 11,
		fontFamily: "var(--mono)",
		background: "transparent",
		color: fg,
		border: `1px solid ${bd}`,
		borderRadius: 3,
		cursor: "pointer",
	};
}
