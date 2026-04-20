import { auth } from "@/auth";
import { prisma } from "@/server/db";
import type { AutologinStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const ALLOWED_STATUSES: AutologinStatus[] = ["RUNNING", "SUCCEEDED", "FAILED"];

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.max(1, Math.min(100, Number.isFinite(rawLimit) ? rawLimit : 50));
  const statusParam = url.searchParams.get("status") as AutologinStatus | null;
  const brokerId = url.searchParams.get("brokerId");

  const where: Record<string, unknown> = {};
  if (statusParam && ALLOWED_STATUSES.includes(statusParam)) where.status = statusParam;
  if (brokerId) where.brokerId = brokerId;

  const attempts = await prisma.autologinAttempt.findMany({
    where,
    include: {
      broker: { select: { id: true, name: true } },
      lead: { select: { id: true, traceId: true, email: true, geo: true } },
      proxyEndpoint: { select: { id: true, label: true, country: true } },
    },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ attempts });
}
