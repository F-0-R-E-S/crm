import { auth } from "@/auth";
import { aggregateBrokerErrors, computeSla } from "@/server/broker-errors/aggregator";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const { id } = await params;
  const broker = await prisma.broker.findUnique({ where: { id }, select: { id: true } });
  if (!broker)
    return NextResponse.json({ error: { code: "broker_not_found" } }, { status: 404 });

  const url = new URL(req.url);
  const from = new Date(url.searchParams.get("from") ?? "");
  const to = new Date(url.searchParams.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from)
    return NextResponse.json({ error: { code: "invalid_date_range" } }, { status: 400 });

  const r = await aggregateBrokerErrors({ brokerId: id, from, to });
  const sla = computeSla(r);
  return NextResponse.json({
    broker_id: id,
    from: from.toISOString(),
    to: to.toISOString(),
    total_pushes: r.total_pushes,
    success_pushes: r.success_pushes,
    error_pushes: r.error_pushes,
    timeout_pushes: r.timeout_pushes,
    error_rate: r.error_rate,
    timeout_rate: r.timeout_rate,
    latency_p50_ms: r.latency_p50_ms,
    latency_p95_ms: r.latency_p95_ms,
    top_error_codes: r.top_error_codes,
    sla,
  });
}
