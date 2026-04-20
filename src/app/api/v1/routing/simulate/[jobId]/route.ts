import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const { jobId } = await params;
  const job = await prisma.auditLog.findFirst({
    where: { entity: "SimulateJob", entityId: jobId },
  });
  if (!job) return NextResponse.json({ error: { code: "job_not_found" } }, { status: 404 });
  return NextResponse.json({ job_id: jobId, ...(job.diff as object) });
}
