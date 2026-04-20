import { prisma } from "@/server/db";
import { simulateRoute } from "@/server/routing/simulator";
import type { Job } from "pg-boss";

export interface BatchSimulateJob {
  jobId: string;
  flowId: string;
  leads: Array<{
    geo: string;
    affiliate_id: string;
    sub_id?: string;
    utm?: Record<string, unknown>;
  }>;
}

export async function handleBatchSimulate(job: Job<BatchSimulateJob>): Promise<void> {
  const { jobId, flowId, leads } = job.data;
  const results: unknown[] = [];
  for (const lead of leads) {
    const out = await simulateRoute({
      flowId,
      leadPayload: {
        geo: lead.geo,
        affiliateId: lead.affiliate_id,
        subId: lead.sub_id,
        utm: lead.utm,
      },
    });
    results.push(out);
  }
  await prisma.auditLog.updateMany({
    where: { entity: "SimulateJob", entityId: jobId },
    data: {
      diff: { flow_id: flowId, total: leads.length, status: "done", results } as object,
    },
  });
}
