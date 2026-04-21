// ─────────────────────────────────────────────────────────────────────────
// Flow-graph ↔ visual-graph adapter.
//
// The persistence layer stores a {nodes, edges} FlowGraph (see ./model.ts).
// The visual editor renders it with `reactflow`, which needs {id, position,
// data, type} nodes plus {id, source, target} edges.
//
// This module does two things:
//
//   flowToGraph(flow)  → VisualGraph   — auto-layout + UI payload
//   graphToFlow(visual) → FlowGraph    — strip positions back to persistence
//
// Layout is a minimal left→right sugiyama: we bucket nodes by role
// (Entry → Branch/Filter → Algorithm → BrokerTarget → Fallback → Exit) and
// space them on a grid. Positions are round-trippable through `meta.pos`
// when callers want to preserve user drag edits.
// ─────────────────────────────────────────────────────────────────────────

import type { FlowEdge, FlowGraph, FlowNode } from "./model";

export type VisualNodeType =
  | "entry"
  | "filter"
  | "branch"
  | "algorithm"
  | "brokerTarget"
  | "fallback"
  | "exit";

export interface VisualNode {
  id: string;
  type: VisualNodeType;
  position: { x: number; y: number };
  data: {
    kind: FlowNode["kind"];
    label: string;
    raw: FlowNode;
  };
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  data: { condition: FlowEdge["condition"] };
}

export interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}

const COLUMN_X: Record<VisualNodeType, number> = {
  entry: 0,
  filter: 260,
  branch: 260,
  algorithm: 540,
  brokerTarget: 820,
  fallback: 1100,
  exit: 1380,
};

const ROW_STEP = 120;

function visualTypeFor(kind: FlowNode["kind"]): VisualNodeType {
  switch (kind) {
    case "Entry":
      return "entry";
    case "Filter":
      return "filter";
    case "Algorithm":
      return "algorithm";
    case "BrokerTarget":
      return "brokerTarget";
    case "Fallback":
      return "fallback";
    case "Exit":
      return "exit";
    default: {
      // Exhaustiveness guard — `kind` is the discriminant.
      const exhaustive: never = kind;
      throw new Error(`unknown kind: ${String(exhaustive)}`);
    }
  }
}

function labelFor(node: FlowNode): string {
  if (node.label) return node.label;
  switch (node.kind) {
    case "Entry":
      return "Entry";
    case "Filter":
      return `Filter · ${node.conditions.length} cond`;
    case "Algorithm":
      return `Algorithm · ${node.mode === "WEIGHTED_ROUND_ROBIN" ? "WRR" : "Slots-Chance"}`;
    case "BrokerTarget":
      return `Broker · ${node.brokerId.slice(0, 10)}`;
    case "Fallback":
      return `Fallback · ${node.maxHop} hop${node.maxHop === 1 ? "" : "s"}`;
    case "Exit":
      return "Exit";
  }
}

/**
 * Deterministically layout a FlowGraph for reactflow consumption.
 *
 * Position precedence (first match wins):
 *   1. explicit `positions` argument (legacy side-channel, still honored)
 *   2. `node.meta.pos` persisted on the FlowNode itself
 *   3. auto-layout column/row buckets
 *
 * @param flow - The persistence-side FlowGraph (from DB / API).
 * @param positions - Optional per-node overrides, keyed by node.id.
 *                    Lets callers preserve user drag edits across round trips.
 */
export function flowToGraph(
  flow: FlowGraph,
  positions?: Record<string, { x: number; y: number }>,
): VisualGraph {
  // Bucket by visual type for auto-layout.
  const byType: Record<VisualNodeType, FlowNode[]> = {
    entry: [],
    filter: [],
    branch: [],
    algorithm: [],
    brokerTarget: [],
    fallback: [],
    exit: [],
  };
  for (const n of flow.nodes) {
    byType[visualTypeFor(n.kind)].push(n);
  }

  const nodes: VisualNode[] = [];
  for (const t of Object.keys(byType) as VisualNodeType[]) {
    const list = byType[t];
    list.forEach((n, i) => {
      const override = positions?.[n.id];
      const metaPos = (n as FlowNode & { meta?: { pos?: { x: number; y: number } } }).meta?.pos;
      const x = override?.x ?? metaPos?.x ?? COLUMN_X[t];
      const y = override?.y ?? metaPos?.y ?? i * ROW_STEP;
      nodes.push({
        id: n.id,
        type: t,
        position: { x, y },
        data: { kind: n.kind, label: labelFor(n), raw: n },
      });
    });
  }

  const edges: VisualEdge[] = flow.edges.map((e, idx) => ({
    id: `${e.from}->${e.to}#${idx}`,
    source: e.from,
    target: e.to,
    label: e.condition === "default" ? undefined : e.condition,
    data: { condition: e.condition },
  }));

  return { nodes, edges };
}

/**
 * Fold visual-graph state back to the persistence-side FlowGraph shape.
 *
 * - Stamps the current reactflow `position` onto `meta.pos` of each
 *   node so layout survives the JSON round-trip. Callers that don't
 *   want positions persisted can pass `{persistPositions: false}`.
 * - Re-builds edges from visual-graph `source`/`target`/`data.condition`.
 * - Preserves node.kind by reading `data.raw` (the last authoritative
 *   snapshot of the node from the inspector edits).
 */
export function graphToFlow(visual: VisualGraph, opts?: { persistPositions?: boolean }): FlowGraph {
  const persistPositions = opts?.persistPositions !== false;
  const nodes: FlowNode[] = visual.nodes.map((v) => {
    const raw = v.data.raw as FlowNode & { meta?: Record<string, unknown> };
    if (!persistPositions) return v.data.raw;
    const nextMeta = {
      ...(raw.meta ?? {}),
      pos: { x: v.position.x, y: v.position.y },
    };
    return { ...raw, meta: nextMeta } as FlowNode;
  });
  const edges: FlowEdge[] = visual.edges.map((e) => ({
    from: e.source,
    to: e.target,
    condition: e.data.condition ?? "default",
  }));
  return { nodes, edges };
}

/**
 * Extract a positions snapshot keyed by node id — useful when persisting
 * user drag edits alongside the FlowGraph (e.g. in FlowVersion.algorithm).
 */
export function extractPositions(visual: VisualGraph): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of visual.nodes) out[n.id] = n.position;
  return out;
}
