import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { type FallbackStepSpec, detectFallbackCycle } from "../fallback/orchestrator";
import { smartPoolToFallbackSteps } from "./compile-smartpool";
import { rankedBrokerChildren, smartPoolNodes } from "./graph-walker";
import type { FlowGraph } from "./model";
import { validateDraftOrThrow } from "./repository";

function lockKey(flowId: string): bigint {
  let h = 5381n;
  for (const c of flowId) h = ((h << 5n) + h + BigInt(c.charCodeAt(0))) & 0xffffffffffffffffn;
  return h & 0x7fffffffffffffffn;
}

/**
 * Compile any SmartPool nodes in the draft graph to FallbackStep rows.
 * These are additive to whatever author-level FallbackStep rows exist
 * (e.g. from explicit Fallback nodes) — we distinguish them by
 * fromNodeId, so author rows with a fromNodeId already used by a pool
 * are overridden by the pool chain to avoid duplicate retries.
 *
 * Returns both the merged step list (for cycle detection) and the
 * pool-derived subset (for persistence alongside hand-authored rows).
 */
function compilePoolSteps(graph: FlowGraph): FallbackStepSpec[] {
  const all: FallbackStepSpec[] = [];
  for (const pool of smartPoolNodes(graph)) {
    const ranked = rankedBrokerChildren(graph, pool.id);
    const compiled = smartPoolToFallbackSteps(pool, ranked);
    all.push(...compiled.steps);
  }
  return all;
}

export async function publishFlow(flowId: string, userId: string) {
  const { latest } = await validateDraftOrThrow(flowId);
  const graph = latest.graph as unknown as FlowGraph;

  // Persisted (hand-authored) fallback rows, if any.
  const fallbackRows = await prisma.fallbackStep.findMany({
    where: { flowVersionId: latest.id },
  });
  const authored: FallbackStepSpec[] = fallbackRows.map((r) => ({
    fromNodeId: r.fromNodeId,
    toNodeId: r.toNodeId,
    hopOrder: r.hopOrder,
    triggers: r.triggers as unknown as FallbackStepSpec["triggers"],
  }));
  // Pool-derived rows, compiled at publish time.
  const poolSteps = compilePoolSteps(graph);

  // Merge: pool-derived steps take precedence over any authored row
  // with the same (fromNodeId, hopOrder) — pools are the authoritative
  // source for their own chain.
  const merged = new Map<string, FallbackStepSpec>();
  for (const s of authored) merged.set(`${s.fromNodeId}:${s.hopOrder}`, s);
  for (const s of poolSteps) merged.set(`${s.fromNodeId}:${s.hopOrder}`, s);
  const allSteps = Array.from(merged.values());

  const cyc = detectFallbackCycle(allSteps);
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

    // Replace FallbackStep rows for this version with the merged set so
    // SmartPool adds/updates/removes propagate cleanly. Author rows that
    // weren't overwritten are preserved by the merge above.
    if (poolSteps.length > 0 || authored.length > 0) {
      await tx.fallbackStep.deleteMany({ where: { flowVersionId: latest.id } });
      if (allSteps.length > 0) {
        await tx.fallbackStep.createMany({
          data: allSteps.map((s) => ({
            flowVersionId: latest.id,
            fromNodeId: s.fromNodeId,
            toNodeId: s.toNodeId,
            hopOrder: s.hopOrder,
            triggers: s.triggers as unknown as object,
          })),
        });
      }
    }

    await tx.flowVersion.update({
      where: { id: latest.id },
      data: { publishedAt: now, publishedBy: userId },
    });
    const updated = await tx.flow.update({
      where: { id: flowId },
      data: { status: "PUBLISHED", activeVersionId: latest.id, archivedAt: null },
    });
    logger.info(
      {
        event: "flow_published",
        flow_id: flowId,
        version_id: latest.id,
        smart_pool_chains: poolSteps.length,
      },
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
