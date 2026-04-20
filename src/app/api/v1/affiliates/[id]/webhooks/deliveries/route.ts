import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? "50"));
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhook: { affiliateId: id } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      webhookId: true,
      eventType: true,
      signature: true,
      attempt: true,
      lastStatus: true,
      lastError: true,
      nextAttemptAt: true,
      deliveredAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ deliveries });
}
