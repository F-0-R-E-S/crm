import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { COUNTER_NAMES, readAll } from "@/server/metrics/rolling-counters";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const counters = await readAll([
    COUNTER_NAMES.LEADS_RECEIVED,
    COUNTER_NAMES.LEADS_PUSHED,
    COUNTER_NAMES.FRAUD_HIT,
    COUNTER_NAMES.BROKER_DOWN,
  ]);

  let manualQueueDepth = 0;
  try {
    const rows = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM pgboss.job WHERE name = 'manual-queue' AND state IN ('created','retry','active')`;
    manualQueueDepth = Number(rows[0]?.count ?? 0);
  } catch {
    manualQueueDepth = 0;
  }

  return NextResponse.json({
    window_seconds: 60,
    leads_received: counters[COUNTER_NAMES.LEADS_RECEIVED] ?? 0,
    leads_pushed: counters[COUNTER_NAMES.LEADS_PUSHED] ?? 0,
    fraud_hit: counters[COUNTER_NAMES.FRAUD_HIT] ?? 0,
    broker_down_count: counters[COUNTER_NAMES.BROKER_DOWN] ?? 0,
    manual_queue_depth: manualQueueDepth,
  });
}
