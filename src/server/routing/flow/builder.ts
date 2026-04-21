// Pure graph-mutation helpers for the visual editor.
//
// The visual editor holds a FlowGraph in local state and must give the
// user the ability to structurally grow the graph (add broker targets,
// filters, fallbacks, edges) and shrink it (delete nodes / edges).
// Keeping the mutations pure lets us:
//
//   - snapshot-test each operation deterministically
//   - re-use helpers for both the reactflow `onConnect` path and the
//     toolbar "add ..." buttons
//   - guarantee IDs stay unique across repeat adds
//
// Every helper returns a NEW graph; callers should treat inputs as
// immutable. IDs follow a `<prefix>_<seq>` pattern where `<seq>` is the
// lowest positive integer that does not already exist.

import type { FlowEdge, FlowGraph, FlowNode } from "./model";

export type AlgoMode = "WEIGHTED_ROUND_ROBIN" | "SLOTS_CHANCE";

/** Generate an ID of the form `<prefix>_<n>` that is not already used. */
export function nextId(prefix: string, g: FlowGraph): string {
  const used = new Set(g.nodes.map((n) => n.id));
  // Start at 1; keep counting until we find a free slot. O(nodes) in the
  // worst case but graphs are small (<200 nodes per Zod schema).
  for (let i = 1; i <= 10_000; i++) {
    const id = `${prefix}_${i}`;
    if (!used.has(id)) return id;
  }
  // 10_000 collisions means we have bigger problems; fall back to a
  // time-based id so the caller at least fails with a unique id.
  return `${prefix}_${Date.now()}`;
}

/** Count how many BrokerTarget nodes the graph currently contains. */
export function brokerTargetCount(g: FlowGraph): number {
  return g.nodes.filter((n) => n.kind === "BrokerTarget").length;
}

/** Find the first Algorithm node id (there is usually only one). */
export function findAlgorithmNodeId(g: FlowGraph): string | null {
  return g.nodes.find((n) => n.kind === "Algorithm")?.id ?? null;
}

/**
 * Append a BrokerTarget node to the graph, connecting it to the flow's
 * Algorithm node. Defaults:
 *   WRR   → weight=1
 *   Slots → chance=equal-share across existing broker targets,
 *           rebalancing existing BrokerTarget.chance so Σ = 100.
 *
 * Returns {graph, nodeId} so the caller can select the newly-added node.
 */
export function addBrokerTarget(
  g: FlowGraph,
  brokerId: string,
  mode: AlgoMode,
): { graph: FlowGraph; nodeId: string } {
  const algoId = findAlgorithmNodeId(g);
  if (!algoId) throw new Error("graph has no Algorithm node; cannot add a BrokerTarget");
  const id = nextId("bt", g);

  let newNodes: FlowNode[];
  if (mode === "WEIGHTED_ROUND_ROBIN") {
    const newTarget: FlowNode = {
      id,
      kind: "BrokerTarget",
      brokerId,
      weight: 1,
    };
    newNodes = [...g.nodes, newTarget];
  } else {
    // Slots-Chance: re-normalize existing targets + add new one with
    // equal share. Round down to 2dp, drop rounding on the new entry.
    const existingTargets = g.nodes.filter((n) => n.kind === "BrokerTarget");
    const nextCount = existingTargets.length + 1;
    const eachShare = Math.floor((100 / nextCount) * 100) / 100;
    let running = 0;
    const rebased: FlowNode[] = existingTargets.map((n) => {
      running += eachShare;
      return { ...n, chance: eachShare } as FlowNode;
    });
    const newTarget: FlowNode = {
      id,
      kind: "BrokerTarget",
      brokerId,
      chance: Math.round((100 - running) * 100) / 100,
    };
    // Replace existing BrokerTargets with rebalanced copies and append
    // the new target.
    const nonTargets = g.nodes.filter((n) => n.kind !== "BrokerTarget");
    newNodes = [...nonTargets, ...rebased, newTarget];
  }

  const newEdge: FlowEdge = { from: algoId, to: id, condition: "default" };
  return {
    graph: { nodes: newNodes, edges: [...g.edges, newEdge] },
    nodeId: id,
  };
}

/**
 * Remove a BrokerTarget node + all adjacent edges. If the graph uses
 * Slots-Chance, renormalize the remaining BrokerTargets so Σ chance =
 * 100 (if >0 targets remain).
 */
export function removeBrokerTarget(g: FlowGraph, nodeId: string, mode: AlgoMode): FlowGraph {
  const target = g.nodes.find((n) => n.id === nodeId);
  if (!target || target.kind !== "BrokerTarget") {
    throw new Error(`node ${nodeId} is not a BrokerTarget`);
  }
  const remainingNodes = g.nodes.filter((n) => n.id !== nodeId);
  const remainingEdges = g.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);

  if (mode === "SLOTS_CHANCE") {
    const targets = remainingNodes.filter((n) => n.kind === "BrokerTarget");
    if (targets.length > 0) {
      const each = Math.floor((100 / targets.length) * 100) / 100;
      let running = 0;
      const rebalanced = remainingNodes.map((n) => {
        if (n.kind !== "BrokerTarget") return n;
        running += each;
        const isLast = targets[targets.length - 1]?.id === n.id;
        return {
          ...n,
          chance: isLast ? Math.round((100 - (running - each)) * 100) / 100 : each,
        } as FlowNode;
      });
      return { nodes: rebalanced, edges: remainingEdges };
    }
  }

  return { nodes: remainingNodes, edges: remainingEdges };
}

/** Add a Filter node with an empty-ish default (user edits via inspector). */
export function addFilterNode(g: FlowGraph): { graph: FlowGraph; nodeId: string } {
  const id = nextId("filter", g);
  const node: FlowNode = {
    id,
    kind: "Filter",
    // Start with a harmless placeholder predicate — the Zod schema
    // requires `conditions.length >= 1`, so we seed one sensible row.
    conditions: [{ field: "geo", op: "in", value: [] }],
    logic: "AND",
  };
  return { graph: { nodes: [...g.nodes, node], edges: g.edges }, nodeId: id };
}

/** Add a Fallback node with sane trigger defaults. */
export function addFallbackNode(g: FlowGraph): { graph: FlowGraph; nodeId: string } {
  const id = nextId("fb", g);
  const node: FlowNode = {
    id,
    kind: "Fallback",
    maxHop: 3,
    triggers: {
      timeoutMs: 2000,
      httpStatusCodes: [500, 502, 503, 504],
      connectionError: true,
      explicitReject: true,
    },
  };
  return { graph: { nodes: [...g.nodes, node], edges: g.edges }, nodeId: id };
}

/** Add an Exit node; caller is responsible for ensuring uniqueness per flow. */
export function addExitNode(g: FlowGraph): { graph: FlowGraph; nodeId: string } {
  const id = nextId("exit", g);
  const node: FlowNode = { id, kind: "Exit", label: "Exit" };
  return { graph: { nodes: [...g.nodes, node], edges: g.edges }, nodeId: id };
}

/**
 * Delete a node + all incident edges. Entry and Exit nodes are
 * protected: deleting an Entry is always forbidden; deleting the last
 * remaining Exit is also forbidden.
 */
export function deleteNode(g: FlowGraph, nodeId: string): FlowGraph {
  const target = g.nodes.find((n) => n.id === nodeId);
  if (!target) return g;
  if (target.kind === "Entry") throw new Error("cannot delete Entry node");
  if (target.kind === "Exit") {
    const exitCount = g.nodes.filter((n) => n.kind === "Exit").length;
    if (exitCount <= 1) throw new Error("cannot delete the last Exit node");
  }
  return {
    nodes: g.nodes.filter((n) => n.id !== nodeId),
    edges: g.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
  };
}

/**
 * Add an edge from `from`→`to`. Enforces these invariants:
 *   - no self-loops (from === to)
 *   - never connect INTO an Entry
 *   - never connect FROM an Exit
 *   - duplicate edges are de-duplicated (same from/to/condition)
 */
export function addEdge(
  g: FlowGraph,
  edge: { from: string; to: string; condition?: FlowEdge["condition"] },
): FlowGraph {
  if (edge.from === edge.to) throw new Error("self-loops are not allowed");
  const fromNode = g.nodes.find((n) => n.id === edge.from);
  const toNode = g.nodes.find((n) => n.id === edge.to);
  if (!fromNode) throw new Error(`unknown source node: ${edge.from}`);
  if (!toNode) throw new Error(`unknown target node: ${edge.to}`);
  if (toNode.kind === "Entry") throw new Error("edges cannot target the Entry node");
  if (fromNode.kind === "Exit") throw new Error("edges cannot originate from an Exit node");

  const condition = edge.condition ?? "default";
  const exists = g.edges.some(
    (e) => e.from === edge.from && e.to === edge.to && e.condition === condition,
  );
  if (exists) return g;
  return {
    nodes: g.nodes,
    edges: [...g.edges, { from: edge.from, to: edge.to, condition }],
  };
}

/** Delete a single edge matching from/to (and condition, if supplied). */
export function deleteEdge(
  g: FlowGraph,
  edge: { from: string; to: string; condition?: FlowEdge["condition"] },
): FlowGraph {
  return {
    nodes: g.nodes,
    edges: g.edges.filter((e) => {
      if (e.from !== edge.from || e.to !== edge.to) return true;
      if (edge.condition && e.condition !== edge.condition) return true;
      return false;
    }),
  };
}

/**
 * Returns the set of node-ids reachable from the Entry node, traversing
 * forward edges only. Used by the publish guard to check that at least
 * one BrokerTarget is reachable.
 */
export function reachableFromEntry(g: FlowGraph): Set<string> {
  const entry = g.nodes.find((n) => n.kind === "Entry");
  if (!entry) return new Set();
  const adj = new Map<string, string[]>();
  for (const n of g.nodes) adj.set(n.id, []);
  for (const e of g.edges) adj.get(e.from)?.push(e.to);
  const seen = new Set<string>();
  const stack = [entry.id];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) ?? []) stack.push(next);
  }
  return seen;
}

/** True iff the graph has at least one BrokerTarget reachable from Entry. */
export function hasReachableBrokerTarget(g: FlowGraph): boolean {
  const reach = reachableFromEntry(g);
  return g.nodes.some((n) => n.kind === "BrokerTarget" && reach.has(n.id));
}
