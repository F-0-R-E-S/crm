// FlowGraph ↔ TreeRoot projection — the tree-list editor's backing
// shape. The tree is a hierarchy of folders (Filter, SmartPool,
// ComparingSplit, Algorithm) rooted at Entry, with BrokerTarget leaves.
// For now, `flowToTree` is a display-side fold; the inverse
// `treeToFlow` is reserved for when inline-edit UX requires writing
// back. The canvas remains the authoritative authoring surface.
//
// Design principles:
//  - Every BrokerTarget is a leaf.
//  - Filter / Algorithm / SmartPool / ComparingSplit / Fallback are
//    parents; children are downstream BrokerTargets reachable in one
//    edge hop.
//  - Entry and Exit are walked but don't surface in the tree (they're
//    the implicit flow boundaries).
//  - Un-parented BrokerTargets (directly under Entry with no
//    intermediate algo) surface as a synthetic "Orphaned" folder.

import type {
  BrokerTargetNode,
  ComparingSplitNode,
  FilterNode,
  FlowGraph,
  FlowNode,
  SmartPoolNode,
} from "./model";

export interface TreeBrokerLeaf {
  kind: "brokerTarget";
  nodeId: string;
  brokerId: string;
  label: string | undefined;
  description: string | undefined;
  active: boolean;
  weight: number | undefined;
  chance: number | undefined;
  slots: number | undefined;
  hasPqlGate: boolean;
}

export interface TreeFolderCommon {
  nodeId: string;
  label: string | undefined;
  children: Array<TreeFolder | TreeBrokerLeaf>;
}

export interface TreeFilterFolder extends TreeFolderCommon {
  kind: "filter";
  rules: FilterNode["rules"];
  logic: "AND" | "OR";
}

export interface TreeAlgorithmFolder extends TreeFolderCommon {
  kind: "algorithm";
  mode: "WEIGHTED_ROUND_ROBIN" | "SLOTS_CHANCE";
}

export interface TreeSmartPoolFolder extends TreeFolderCommon {
  kind: "smartPool";
  maxHop: number;
}

export interface TreeComparingSplitFolder extends TreeFolderCommon {
  kind: "comparingSplit";
  compareMetric: ComparingSplitNode["compareMetric"];
  sampleSize: number;
}

export interface TreeFallbackFolder extends TreeFolderCommon {
  kind: "fallback";
  maxHop: number;
}

export type TreeFolder =
  | TreeFilterFolder
  | TreeAlgorithmFolder
  | TreeSmartPoolFolder
  | TreeComparingSplitFolder
  | TreeFallbackFolder;

export interface TreeRoot {
  folders: Array<TreeFolder | TreeBrokerLeaf>;
}

function brokerLeaf(node: BrokerTargetNode): TreeBrokerLeaf {
  return {
    kind: "brokerTarget",
    nodeId: node.id,
    brokerId: node.brokerId,
    label: node.label,
    description: node.description,
    active: node.active !== false,
    weight: node.weight,
    chance: node.chance,
    slots: node.slots,
    hasPqlGate: !!node.pqlGate && node.pqlGate.rules.length > 0,
  };
}

function childrenOf(
  graph: FlowGraph,
  parentId: string,
  byId: Map<string, FlowNode>,
  visited: Set<string>,
): Array<TreeFolder | TreeBrokerLeaf> {
  const out: Array<TreeFolder | TreeBrokerLeaf> = [];
  for (const e of graph.edges) {
    if (e.from !== parentId) continue;
    if (visited.has(e.to)) continue;
    const node = byId.get(e.to);
    if (!node) continue;
    // Skip Entry/Exit — they're flow boundaries.
    if (node.kind === "Entry" || node.kind === "Exit") continue;
    const sub = folderFor(node, graph, byId, visited);
    if (sub) out.push(sub);
  }
  return out;
}

function folderFor(
  node: FlowNode,
  graph: FlowGraph,
  byId: Map<string, FlowNode>,
  visited: Set<string>,
): TreeFolder | TreeBrokerLeaf | null {
  if (visited.has(node.id)) return null;
  visited.add(node.id);
  switch (node.kind) {
    case "BrokerTarget":
      return brokerLeaf(node);
    case "Filter": {
      const f: FilterNode = node;
      return {
        kind: "filter",
        nodeId: f.id,
        label: f.label,
        rules: f.rules,
        logic: f.logic,
        children: childrenOf(graph, f.id, byId, visited),
      };
    }
    case "Algorithm": {
      return {
        kind: "algorithm",
        nodeId: node.id,
        label: node.label,
        mode: node.mode,
        children: childrenOf(graph, node.id, byId, visited),
      };
    }
    case "SmartPool": {
      const sp: SmartPoolNode = node;
      return {
        kind: "smartPool",
        nodeId: sp.id,
        label: sp.label,
        maxHop: sp.maxHop,
        children: childrenOf(graph, sp.id, byId, visited),
      };
    }
    case "ComparingSplit": {
      const cs: ComparingSplitNode = node;
      return {
        kind: "comparingSplit",
        nodeId: cs.id,
        label: cs.label,
        compareMetric: cs.compareMetric,
        sampleSize: cs.sampleSize,
        children: childrenOf(graph, cs.id, byId, visited),
      };
    }
    case "Fallback": {
      return {
        kind: "fallback",
        nodeId: node.id,
        label: node.label,
        maxHop: node.maxHop,
        children: childrenOf(graph, node.id, byId, visited),
      };
    }
    default:
      return null;
  }
}

/**
 * Fold a FlowGraph into the tree-list display shape. The traversal
 * starts at Entry; un-parented nodes (reachable only via orphaned
 * edges) are ignored — the graph-canvas publish guard requires
 * reachability anyway.
 */
export function flowToTree(graph: FlowGraph): TreeRoot {
  const byId = new Map<string, FlowNode>();
  for (const n of graph.nodes) byId.set(n.id, n);
  const entry = graph.nodes.find((n) => n.kind === "Entry");
  if (!entry) return { folders: [] };
  const visited = new Set<string>([entry.id]);
  return { folders: childrenOf(graph, entry.id, byId, visited) };
}

/**
 * Count every broker-target leaf under a folder (recursive).
 */
export function countLeaves(node: TreeFolder | TreeBrokerLeaf): number {
  if (node.kind === "brokerTarget") return 1;
  let n = 0;
  for (const c of node.children) n += countLeaves(c);
  return n;
}

/**
 * Summarize the shape of a tree for logging / snapshot diffing.
 * Deterministic, compact, useful for tests that assert "this flow
 * produces the expected shape" without caring about every id.
 */
export function summarizeTree(root: TreeRoot): string {
  const stringify = (n: TreeFolder | TreeBrokerLeaf): string => {
    if (n.kind === "brokerTarget") return `[bt:${n.brokerId}]`;
    return `(${n.kind}:${n.children.map(stringify).join(",")})`;
  };
  return root.folders.map(stringify).join(";");
}
