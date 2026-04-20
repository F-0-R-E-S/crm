import { auth } from "@/auth";
import { redactObject } from "@/server/audit/pii-mask";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> },
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR"))
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const { id: affiliateId, leadId } = await params;
  const lead = await prisma.lead.findFirst({ where: { id: leadId, affiliateId } });
  if (!lead) return NextResponse.json({ error: { code: "lead_not_found" } }, { status: 404 });

  const events = await prisma.leadEvent.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      meta: true,
      createdAt: true,
      rowHash: true,
      prevHash: true,
    },
  });

  return NextResponse.json({
    lead_id: leadId,
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      meta: redactObject(e.meta),
      created_at: e.createdAt.toISOString(),
      row_hash: e.rowHash,
      prev_hash: e.prevHash,
    })),
  });
}
