"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { InvoiceDrawer } from "./_components/invoice-drawer";

type Tab = "broker" | "affiliate";
type InvoiceStatus = "DRAFT" | "SENT" | "PAID";

export default function InvoicesPage() {
	const [tab, setTab] = useState<Tab>("broker");
	const [openId, setOpenId] = useState<string | null>(null);
	const invoices = trpc.finance.listInvoices.useQuery({ tab });

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
				<h1 style={{ fontSize: 15, fontWeight: 600 }}>Invoices</h1>
				<Tabs value={tab} onChange={setTab} />
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
							<th style={{ padding: "8px 0 8px 16px" }}>Period</th>
							<th>Amount</th>
							<th>Currency</th>
							<th>Status</th>
							<th>Linked</th>
							<th />
						</tr>
					</thead>
					<tbody>
						{invoices.data?.map((inv) => (
							<tr
								key={inv.id}
								onClick={() => setOpenId(inv.id)}
								style={{
									cursor: "pointer",
									borderBottom: "1px solid var(--bd-1)",
								}}
							>
								<td
									style={{
										padding: "8px 0 8px 16px",
										fontFamily: "var(--mono)",
									}}
								>
									{new Date(inv.periodStart).toISOString().slice(0, 10)} →{" "}
									{new Date(inv.periodEnd).toISOString().slice(0, 10)}
								</td>
								<td style={{ fontFamily: "var(--mono)" }}>${inv.amount.toString()}</td>
								<td>{inv.currency}</td>
								<td>
									<StatusBadge status={inv.status as InvoiceStatus} />
								</td>
								<td>{"brokerInvoiceId" in inv && inv.brokerInvoiceId ? "✓" : ""}</td>
								<td />
							</tr>
						))}
					</tbody>
				</table>
				{invoices.data && invoices.data.length === 0 ? (
					<div style={{ padding: 24, fontSize: 13, opacity: 0.6 }}>No invoices.</div>
				) : null}
			</div>
			<InvoiceDrawer id={openId} kind={tab} onClose={() => setOpenId(null)} />
		</div>
	);
}

function Tabs({ value, onChange }: { value: Tab; onChange: (v: Tab) => void }) {
	const tabs: Tab[] = ["broker", "affiliate"];
	return (
		<div style={{ display: "flex", fontSize: 12 }}>
			{tabs.map((t) => (
				<button
					key={t}
					type="button"
					onClick={() => onChange(t)}
					style={{
						padding: "4px 12px",
						borderBottom:
							value === t ? "2px solid var(--fg-0)" : "2px solid transparent",
						background: "transparent",
						border: "none",
						borderBottomWidth: 2,
						borderBottomStyle: "solid",
						borderBottomColor: value === t ? "var(--fg-0)" : "transparent",
						color: value === t ? "var(--fg-0)" : "var(--fg-1)",
						cursor: "pointer",
						fontFamily: "var(--mono)",
					}}
				>
					{t}
				</button>
			))}
		</div>
	);
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
	const tone: Record<InvoiceStatus, { bg: string; fg: string }> = {
		DRAFT: { bg: "rgba(255,255,255,0.08)", fg: "var(--fg-1)" },
		SENT: { bg: "rgba(80, 120, 255, 0.18)", fg: "var(--fg-0)" },
		PAID: { bg: "rgba(70, 180, 100, 0.18)", fg: "var(--fg-0)" },
	};
	const t = tone[status];
	return (
		<span
			style={{
				padding: "2px 8px",
				borderRadius: 3,
				fontSize: 10,
				fontFamily: "var(--mono)",
				textTransform: "uppercase",
				background: t.bg,
				color: t.fg,
			}}
		>
			{status}
		</span>
	);
}
