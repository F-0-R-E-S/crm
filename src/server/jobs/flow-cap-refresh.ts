import type { Job } from "pg-boss";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { remainingCap } from "@/server/routing/constraints/caps";

export interface FlowCapRefreshJob {
  flowVersionId?: string;
}

export async function handleFlowCapRefresh(job: Job<FlowCapRefreshJob>): Promise<void> {
  const where = job.data.flowVersionId
    ? { id: job.data.flowVersionId }
    : { activeFor: { isNot: null } };
  const versions = await prisma.flowVersion.findMany({
    where,
    include: { capDefs: true },
  });
  for (const fv of versions) {
    for (const def of fv.capDefs) {
      const r = await remainingCap({
        scope: def.scope,
        scopeId: def.scopeRefId,
        window: def.window,
        tz: def.timezone,
        limit: def.limit,
      });
      logger.debug(
        {
          event: "cap_refresh",
          flow_version_id: fv.id,
          scope: def.scope,
          scope_ref_id: def.scopeRefId,
          window: def.window,
          used: r.used,
          remaining: r.remaining,
        },
        "cap state",
      );
    }
  }
}
