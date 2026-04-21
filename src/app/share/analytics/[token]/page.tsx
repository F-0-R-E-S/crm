import { AnalyticsParams } from "@/server/analytics/params";
import {
  conversionBreakdown,
  metricSeries,
  rejectBreakdown,
  revenueBreakdown,
} from "@/server/analytics/service";
import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import { SharedAnalyticsView } from "./view";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ token: string }>;
}

async function executeProc(proc: string, input: unknown) {
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

export default async function SharedAnalyticsPage({ params }: RouteProps) {
  const { token } = await params;
  const row = await prisma.analyticsShareLink.findUnique({ where: { token } });
  if (!row) notFound();
  const expired = row.expiresAt.getTime() < Date.now();
  if (expired) {
    return (
      <div
        style={{
          padding: 32,
          fontFamily: "var(--mono, monospace)",
          color: "#c00",
          maxWidth: 520,
          margin: "60px auto",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Link expired</h1>
        <p style={{ fontSize: 13, color: "#888" }}>
          This analytics view expired on {row.expiresAt.toISOString().slice(0, 10)}. Ask the owner
          for a fresh link.
        </p>
      </div>
    );
  }
  const q = row.query as Record<string, unknown> | null;
  const proc = typeof q?.proc === "string" ? q.proc : "metricSeries";
  const data = q ? await executeProc(proc, q) : null;
  return (
    <SharedAnalyticsView
      query={row.query}
      data={data}
      proc={proc}
      expiresAt={row.expiresAt.toISOString()}
    />
  );
}
