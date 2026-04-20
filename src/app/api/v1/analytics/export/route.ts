import { auth } from "@/auth";
import { AnalyticsParams } from "@/server/analytics/params";
import {
	conversionBreakdown,
	metricSeries,
	rejectBreakdown,
	revenueBreakdown,
} from "@/server/analytics/service";
import { NextResponse } from "next/server";

function csvEscape(v: unknown): string {
	const s = v === null || v === undefined ? "" : String(v);
	if (s.includes('"') || s.includes(",") || s.includes("\n")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

function csvRow(cells: unknown[]): string {
	return cells.map(csvEscape).join(",");
}

/**
 * TODO: when row counts exceed ~10k (unlikely for rollups, which top out
 * at ~366 rows/year), swap `NextResponse(csv)` for a `ReadableStream` that
 * pushes rows line-by-line.
 */
export async function GET(req: Request): Promise<Response> {
	const session = await auth();
	if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const url = new URL(req.url);
	const queryRaw = url.searchParams.get("query");
	if (!queryRaw) return NextResponse.json({ error: "missing_query" }, { status: 400 });
	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(queryRaw) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: "invalid_query_json" }, { status: 400 });
	}
	const proc = parsed.proc;
	const paramsParsed = AnalyticsParams.safeParse(parsed);
	if (!paramsParsed.success) {
		return NextResponse.json(
			{ error: "invalid_params", issues: paramsParsed.error.issues },
			{ status: 400 },
		);
	}
	const params = paramsParsed.data;

	let header = "";
	let rows: string[] = [];
	let filename = "analytics.csv";
	switch (proc) {
		case "metricSeries": {
			const data = await metricSeries(params);
			header = "bucket,value";
			rows = data.series.map((p) => csvRow([p.bucket, p.value]));
			filename = "metric-series.csv";
			break;
		}
		case "conversionBreakdown": {
			const data = await conversionBreakdown(params);
			header = "stage,value";
			rows = [
				csvRow(["received", data.stages.received]),
				csvRow(["validated", data.stages.validated]),
				csvRow(["rejected", data.stages.rejected]),
				csvRow(["pushed", data.stages.pushed]),
				csvRow(["accepted", data.stages.accepted]),
				csvRow(["declined", data.stages.declined]),
				csvRow(["ftd", data.stages.ftd]),
			];
			filename = "conversions.csv";
			break;
		}
		case "rejectBreakdown": {
			const data = await rejectBreakdown(params);
			header = "reason,count";
			rows = data.byReason.map((r) => csvRow([r.reason, r.count]));
			filename = "rejects.csv";
			break;
		}
		case "revenueBreakdown": {
			const data = await revenueBreakdown(params);
			header = "bucket,revenue,ftds,pushed";
			rows = data.rows.map((r) => csvRow([r.bucket, r.revenue, r.ftds, r.pushed]));
			filename = "revenue.csv";
			break;
		}
		default:
			return NextResponse.json({ error: "unknown_proc" }, { status: 400 });
	}

	const csv = `${header}\n${rows.join("\n")}\n`;
	return new NextResponse(csv, {
		status: 200,
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="${filename}"`,
		},
	});
}
