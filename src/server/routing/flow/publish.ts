import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { type FallbackStepSpec, detectFallbackCycle } from "../fallback/orchestrator";
import { validateDraftOrThrow } from "./repository";

function lockKey(flowId: string): bigint {
  let h = 5381n;
  for (const c of flowId) h = ((h << 5n) + h + BigInt(c.charCodeAt(0))) & 0xffffffffffffffffn;
  return h & 0x7fffffffffffffffn;
}

export async function publishFlow(flowId: string, userId: string) {
  const { latest } = await validateDraftOrThrow(flowId);
  const fallbackRows = await prisma.fallbackStep.findMany({
    where: { flowVersionId: latest.id },
  });
  const steps: FallbackStepSpec[] = fallbackRows.map((r) => ({
    fromNodeId: r.fromNodeId,
    toNodeId: r.toNodeId,
    hopOrder: r.hopOrder,
    triggers: r.triggers as unknown as FallbackStepSpec["triggers"],
  }));
  const cyc = detectFallbackCycle(steps);
  if (!cyc.ok) {
    const err = new Error("fallback_cycle_detected");
    (err as Error & { details?: unknown }).details = [
      { code: "fallback_cycle_detected", node_id: cyc.cycleStart },
    ];
    throw err;
  }
  return prisma.$transaction(async (tx) => {
    const key = lockKey(flowId);
    const locked = await tx.$queryRaw<{ pg_try_advisory_xact_lock: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(${key}::bigint)
    `;
    if (!locked[0]?.pg_try_advisory_xact_lock) throw new Error("publish_conflict");
    const now = new Date();
    await tx.flowVersion.update({
      where: { id: latest.id },
      data: { publishedAt: now, publishedBy: userId },
    });
    const updated = await tx.flow.update({
      where: { id: flowId },
      data: { status: "PUBLISHED", activeVersionId: latest.id, archivedAt: null },
    });
    logger.info(
      { event: "flow_published", flow_id: flowId, version_id: latest.id },
      "flow published",
    );
    return updated;
  });
}

export async function archiveFlow(flowId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const key = lockKey(flowId);
    const locked = await tx.$queryRaw<{ pg_try_advisory_xact_lock: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(${key}::bigint)
    `;
    if (!locked[0]?.pg_try_advisory_xact_lock) throw new Error("archive_conflict");
    const updated = await tx.flow.update({
      where: { id: flowId },
      data: { status: "ARCHIVED", activeVersionId: null, archivedAt: new Date() },
    });
    logger.info({ event: "flow_archived", flow_id: flowId, by: userId }, "flow archived");
    return updated;
  });
}
