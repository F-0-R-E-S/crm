"use client";
import { trpc } from "@/lib/trpc";

export function InvoiceDrawer({
	id,
	kind,
	onClose,
}: {
	id: string | null;
	kind: "broker" | "affiliate";
	onClose: () => void;
}) {
	const utils = trpc.useUtils();
	const markPaid = trpc.finance.markInvoicePaid.useMutation({
		onSuccess: () => {
			utils.finance.listInvoices.invalidate();
			onClose();
		},
	});
	const pdf = trpc.finance.exportInvoicePdf.useQuery(
		{ kind, id: id ?? "" },
		{ enabled: id !== null },
	);

	if (id === null) return null;
	return (
		<aside
			style={{
				position: "fixed",
				right: 0,
				top: 0,
				width: 540,
				height: "100%",
				background: "var(--bg-0)",
				borderLeft: "1px solid var(--bd-1)",
				overflow: "auto",
				zIndex: 20,
			}}
		>
			<header
				style={{
					padding: 16,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid var(--bd-1)",
				}}
			>
				<h2 style={{ fontSize: 14, fontWeight: 600 }}>Invoice {id}</h2>
				<button
					type="button"
					onClick={onClose}
					aria-label="close"
					style={{
						background: "transparent",
						border: "none",
						cursor: "pointer",
						fontSize: 18,
						color: "var(--fg-0)",
					}}
				>
					×
				</button>
			</header>
			<div style={{ padding: 16, fontSize: 13, display: "flex", flexDirection: "column", gap: 12 }}>
				{pdf.data ? (
					<>
						<div style={{ display: "flex", gap: 8 }}>
							<span style={{ opacity: 0.6 }}>Period:</span>
							<span style={{ fontFamily: "var(--mono)" }}>
								{new Date(pdf.data.invoice.periodStart).toISOString().slice(0, 10)} →{" "}
								{new Date(pdf.data.invoice.periodEnd).toISOString().slice(0, 10)}
							</span>
						</div>
						<div style={{ display: "flex", gap: 8 }}>
							<span style={{ opacity: 0.6 }}>Amount:</span>
							<span style={{ fontFamily: "var(--mono)" }}>${pdf.data.invoice.amount}</span>
						</div>
						<pre
							style={{
								background: "var(--bg-1)",
								padding: 12,
								borderRadius: 4,
								fontSize: 11,
								overflow: "auto",
								maxHeight: 400,
							}}
						>
							{JSON.stringify(pdf.data.invoice.lineItems, null, 2)}
						</pre>
						<div style={{ display: "flex", gap: 8 }}>
							<button
								type="button"
								disabled={markPaid.isPending}
								onClick={() => markPaid.mutate({ kind, id })}
								style={{
									padding: "6px 12px",
									background: "var(--fg-0)",
									color: "var(--bg-0)",
									border: "none",
									borderRadius: 3,
									cursor: "pointer",
								}}
							>
								Mark paid
							</button>
							<button
								type="button"
								onClick={() => alert("PDF export is a JSON placeholder in v1.0")}
								style={{
									padding: "6px 12px",
									border: "1px solid var(--bd-1)",
									background: "transparent",
									color: "var(--fg-0)",
									borderRadius: 3,
									cursor: "pointer",
								}}
							>
								Export PDF
							</button>
						</div>
					</>
				) : (
					<div style={{ opacity: 0.6 }}>Loading…</div>
				)}
			</div>
		</aside>
	);
}
