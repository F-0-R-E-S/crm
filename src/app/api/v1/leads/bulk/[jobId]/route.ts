import { verifyApiKey } from "@/server/auth-api-key";
import { startBossOnce } from "@/server/jobs/queue";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const ctx = await verifyApiKey(req.headers.get("authorization"));
  if (!ctx) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });

  const { jobId } = await params;
  const boss = await startBossOnce();
  const job = await boss.getJobById("bulk-intake", jobId);

  if (!job) return NextResponse.json({ error: { code: "job_not_found" } }, { status: 404 });

  const stateToStatus: Record<string, string> = {
    created: "queued",
    retry: "queued",
    active: "processing",
    completed: "done",
    failed: "failed",
    cancelled: "failed",
  };
  return NextResponse.json({
    job_id: job.id,
    status: stateToStatus[job.state] ?? job.state,
    created_on: job.createdOn,
    completed_on: job.completedOn ?? null,
    output: job.output ?? null,
  });
}
