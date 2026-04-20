import { auth } from "@/auth";
import { aggregateMetrics } from "@/server/intake/metrics";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const url = new URL(req.url);
  const from = new Date(url.searchParams.get("from") ?? "");
  const to = new Date(url.searchParams.get("to") ?? "");
  const interval = (url.searchParams.get("interval") ?? "1h") as "1m" | "5m" | "1h";
  const groupByRaw = url.searchParams.get("group_by");
  const groupBy =
    groupByRaw === "affiliate" || groupByRaw === "geo" || groupByRaw === "status"
      ? groupByRaw
      : null;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return NextResponse.json({ error: { code: "invalid_date_range" } }, { status: 400 });
  }
  if (!["1m", "5m", "1h"].includes(interval)) {
    return NextResponse.json(
      { error: { code: "validation_error", field: "interval" } },
      { status: 422 },
    );
  }

  try {
    const buckets = await aggregateMetrics({ from, to, interval, groupBy, affiliateScope: null });
    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      interval,
      group_by: groupBy,
      buckets,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: { code: msg } }, { status: 400 });
  }
}
