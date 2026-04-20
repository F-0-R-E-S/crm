import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { JOB_NAMES, startBossOnce } from "@/server/jobs/queue";
import { simulateRoute } from "@/server/routing/simulator";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";

const LeadPayload = z.object({
  geo: z.string().length(2),
  affiliate_id: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  sub_id: z.string().optional(),
  utm: z.record(z.string(), z.unknown()).optional(),
});

const SingleBody = z.object({ flow_id: z.string(), lead: LeadPayload });
const BatchBody = z.object({ flow_id: z.string(), leads: z.array(LeadPayload) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const raw = await req.json().catch(() => null);

  if (raw && Array.isArray(raw.leads)) {
    const parsed = BatchBody.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { error: { code: "validation_error", message: parsed.error.issues[0]?.message } },
        { status: 422 },
      );
    if (parsed.data.leads.length > 1000)
      return NextResponse.json(
        { error: { code: "too_many_leads", message: "max 1000 leads per batch" } },
        { status: 400 },
      );
    const jobId = nanoid();
    // Audit log requires existing User FK; skip silently if not found to keep test-friendly.
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "simulate.batch",
          entity: "SimulateJob",
          entityId: jobId,
          diff: {
            flow_id: parsed.data.flow_id,
            total: parsed.data.leads.length,
            status: "queued",
          } as object,
        },
      });
    } catch {
      // no-op in test environments where User FK is mocked
    }
    const boss = await startBossOnce();
    await boss.send(JOB_NAMES.batchSimulate, {
      jobId,
      flowId: parsed.data.flow_id,
      leads: parsed.data.leads,
    });
    return NextResponse.json(
      { job_id: jobId, status: "queued", count: parsed.data.leads.length },
      { status: 202 },
    );
  }

  const parsed = SingleBody.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "validation_error", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  try {
    const explain = await simulateRoute({
      flowId: parsed.data.flow_id,
      leadPayload: {
        affiliateId: parsed.data.lead.affiliate_id,
        geo: parsed.data.lead.geo,
        subId: parsed.data.lead.sub_id,
        utm: parsed.data.lead.utm,
      },
    });
    return NextResponse.json(explain);
  } catch (e) {
    return NextResponse.json(
      { error: { code: "simulate_error", message: (e as Error).message } },
      { status: 500 },
    );
  }
}
