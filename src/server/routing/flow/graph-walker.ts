// Graph-structure helpers used by both the compile-time pass (publish)
// and the runtime engine. Kept pure and dependency-free so the same
// functions can be exercised in unit tests without a DB or Redis.

import type {
  BrokerTargetNode,
  ComparingSplitNode,
  FlowEdge,
  FlowGraph,
  SmartPoolNode,
} from "./model";

/** All BrokerTarget children reachable by a single outgoing edge from
 *  the given parent node, in edge-insertion order. Filters out edges
 *  pointing at non-BrokerTarget nodes. */
export function childrenOf(graph: FlowGraph, parentNodeId: string): BrokerTargetNode[] {
  const targetsById = new Map<string, BrokerTargetNode>();
  for (const n of graph.nodes) {
    if (n.kind === "BrokerTarget") targetsById.set(n.id, n);
  }
  const out: BrokerTargetNode[] = [];
  for (const e of graph.edges) {
    if (e.from !== parentNodeId) continue;
    const child = targetsById.get(e.to);
    if (child) out.push(child);
  }
  return out;
}

/** All SmartPool nodes in the graph. */
export function smartPoolNodes(graph: FlowGraph): SmartPoolNode[] {
  return graph.nodes.filter((n): n is SmartPoolNode => n.kind === "SmartPool");
}

/** All ComparingSplit nodes in the graph. */
export function comparingSplitNodes(graph: FlowGraph): ComparingSplitNode[] {
  return graph.nodes.filter((n): n is ComparingSplitNode => n.kind === "ComparingSplit");
}

/** Lookup table from BrokerTarget nodeId → its parent SmartPool (if any).
 *  Useful for the engine to detect that a broker belongs to a pool so
 *  selection should bypass algorithm and use the pool's primary. */
export function brokerToSmartPool(graph: FlowGraph): Map<string, SmartPoolNode> {
  const pools = smartPoolNodes(graph);
  const out = new Map<string, SmartPoolNode>();
  for (const pool of pools) {
    for (const child of childrenOf(graph, pool.id)) {
      out.set(child.id, pool);
    }
  }
  return out;
}

/** Lookup table from BrokerTarget nodeId → its parent ComparingSplit (if
 *  any). Used by the engine to tag a routing decision with the branch
 *  identity so `ComparingBucketStat` rows can be attributed. */
export function brokerToComparingSplit(graph: FlowGraph): Map<string, ComparingSplitNode> {
  const splits = comparingSplitNodes(graph);
  const out = new Map<string, ComparingSplitNode>();
  for (const split of splits) {
    for (const child of childrenOf(graph, split.id)) {
      out.set(child.id, split);
    }
  }
  return out;
}

/** Sort edges sourced from a given parent by insertion order, then
 *  resolve their target BrokerTarget ids. Used by publishFlow to order
 *  SmartPool children before compiling FallbackStep rows. */
export function rankedBrokerChildren(graph: FlowGraph, parentNodeId: string): string[] {
  const edges = graph.edges.filter((e) => e.from === parentNodeId);
  const targetsById = new Set(
    graph.nodes.filter((n) => n.kind === "BrokerTarget").map((n) => n.id),
  );
  return edges.map((e) => e.to).filter((id) => targetsById.has(id));
}

/** Identify the single Algorithm node in a graph (if any). Returns
 *  null if zero or multiple — callers treat either as "no algorithm". */
export function singleAlgorithmNode(graph: FlowGraph): { id: string } | null {
  const algos = graph.nodes.filter((n) => n.kind === "Algorithm");
  return algos.length === 1 ? { id: algos[0]?.id ?? "" } : null;
}

/** All edges flowing into a node. */
export function incomingEdges(graph: FlowGraph, nodeId: string): FlowEdge[] {
  return graph.edges.filter((e) => e.to === nodeId);
}
