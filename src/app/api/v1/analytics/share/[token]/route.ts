import { AnalyticsParams } from "@/server/analytics/params";
import {
  conversionBreakdown,
  metricSeries,
  rejectBreakdown,
  revenueBreakdown,
} from "@/server/analytics/service";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

async function executeProc(proc: string, input: unknown): Promise<unknown> {
  const parsed = AnalyticsParams.safeParse(input);
  if (!parsed.success) return null;
  switch (proc) {
    case "metricSeries":
      return metricSeries(parsed.data);
    case "conversionBreakdown":
      return conversionBreakdown(parsed.data);
    case "rejectBreakdown":
      return rejectBreakdown(parsed.data);
    case "revenueBreakdown":
      return revenueBreakdown(parsed.data);
    default:
      return null;
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  const row = await prisma.analyticsShareLink.findUnique({ where: { token } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  const q = row.query as Record<string, unknown> | null;
  let data: unknown = null;
  if (q && typeof q.proc === "string") {
    data = await executeProc(q.proc, q);
  }
  return NextResponse.json({
    query: row.query,
    data,
    expiresAt: row.expiresAt.toISOString(),
  });
}
