// One-shot transformer: walk every FlowVersion.graph JSON and rewrite
// Filter nodes from the legacy {conditions, op} shape to the canonical
// {rules, sign, caseSensitive: false} shape.
//
// `FlowGraphSchema` already accepts legacy input via
// `preprocessFlowGraphInput`, so this migration is mostly cosmetic — it
// just stops every read from running through the rewrite path and
// lets us drop the legacy shape one release later. The script is
// idempotent: a graph already in the new shape passes through
// unchanged.
//
// Invocation: `pnpm tsx scripts/migrate-filter-to-pql.ts [--dry-run]`

import type { FlowGraph, FlowNode } from "../model";

export interface MigrationReport {
  flowVersionsScanned: number;
  flowVersionsRewritten: number;
  filterNodesRewritten: number;
}

/** Pure transform: rewrite `{conditions, op}` Filter nodes into the
 *  canonical `{rules, sign, caseSensitive: false}` form. Non-Filter
 *  nodes and already-canonical Filter nodes pass through unchanged. */
export function migrateFilterNodes(graph: FlowGraph): {
  graph: FlowGraph;
  rewrittenCount: number;
} {
  let rewritten = 0;
  const nodes: FlowNode[] = graph.nodes.map((n) => {
    if (n.kind !== "Filter") return n;
    const asRecord = n as unknown as Record<string, unknown>;
    const hasLegacy =
      Array.isArray(asRecord.conditions) && asRecord.conditions.length > 0;
    const hasNew = Array.isArray(asRecord.rules) && (asRecord.rules as unknown[]).length > 0;
    if (!hasLegacy || hasNew) return n;
    const legacy = asRecord.conditions as Array<{
      field?: unknown;
      op?: unknown;
      value?: unknown;
    }>;
    const rules = legacy.map((c) => ({
      field: c.field,
      sign: c.op,
      value: c.value,
      caseSensitive: false,
    }));
    rewritten += 1;
    const { conditions: _drop, ...rest } = asRecord;
    return { ...rest, rules } as unknown as FlowNode;
  });
  return {
    graph: { nodes, edges: graph.edges },
    rewrittenCount: rewritten,
  };
}

/** Driver: walks every non-archived FlowVersion and applies the
 *  transform. `dryRun` short-circuits the writes so ops can verify the
 *  plan before committing. */
export async function runFilterToPqlMigration(opts: {
  prisma: import("@prisma/client").PrismaClient;
  dryRun?: boolean;
}): Promise<MigrationReport> {
  const { prisma, dryRun = false } = opts;
  const rows = await prisma.flowVersion.findMany({
    select: { id: true, graph: true },
  });
  let rewrittenVersions = 0;
  let rewrittenNodes = 0;
  for (const row of rows) {
    const before = row.graph as unknown as FlowGraph;
    if (!before || typeof before !== "object" || !Array.isArray(before.nodes)) continue;
    const { graph: after, rewrittenCount } = migrateFilterNodes(before);
    if (rewrittenCount === 0) continue;
    rewrittenVersions += 1;
    rewrittenNodes += rewrittenCount;
    if (!dryRun) {
      await prisma.flowVersion.update({
        where: { id: row.id },
        data: { graph: after as unknown as import("@prisma/client").Prisma.InputJsonValue },
      });
    }
  }
  return {
    flowVersionsScanned: rows.length,
    flowVersionsRewritten: rewrittenVersions,
    filterNodesRewritten: rewrittenNodes,
  };
}
