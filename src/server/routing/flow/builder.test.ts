import { describe, expect, it } from "vitest";
import {
  addBrokerTarget,
  addEdge,
  addExitNode,
  addFallbackNode,
  addFilterNode,
  brokerTargetCount,
  deleteEdge,
  deleteNode,
  hasReachableBrokerTarget,
  nextId,
  reachableFromEntry,
  removeBrokerTarget,
} from "./builder";
import type { FlowGraph } from "./model";
import { FlowGraphSchema } from "./model";
import { newFlowGraph } from "./seed";

describe("builder · nextId", () => {
  it("returns sequential ids", () => {
    const g = newFlowGraph();
    expect(nextId("bt", g)).toBe("bt_1");
    const withOne: FlowGraph = {
      nodes: [...g.nodes, { id: "bt_1", kind: "BrokerTarget", brokerId: "x", weight: 1 }],
      edges: g.edges,
    };
    expect(nextId("bt", withOne)).toBe("bt_2");
  });
});

describe("builder · addBrokerTarget (WRR)", () => {
  it("adds a BrokerTarget with weight=1 and an algorithm→target edge", () => {
    const start = newFlowGraph();
    const { graph, nodeId } = addBrokerTarget(start, "brk_A", "WEIGHTED_ROUND_ROBIN");
    expect(nodeId).toBe("bt_1");
    expect(brokerTargetCount(graph)).toBe(1);
    const added = graph.nodes.find((n) => n.id === nodeId);
    expect(added?.kind).toBe("BrokerTarget");
    if (added?.kind === "BrokerTarget") {
      expect(added.brokerId).toBe("brk_A");
      expect(added.weight).toBe(1);
    }
    expect(graph.edges.some((e) => e.from === "algo" && e.to === nodeId)).toBe(true);
    expect(() => FlowGraphSchema.parse(graph)).not.toThrow();
  });

  it("adding two broker targets yields two BrokerTarget nodes + two algo→target edges", () => {
    const start = newFlowGraph();
    const { graph: g1 } = addBrokerTarget(start, "brk_A", "WEIGHTED_ROUND_ROBIN");
    const { graph: g2 } = addBrokerTarget(g1, "brk_B", "WEIGHTED_ROUND_ROBIN");
    expect(brokerTargetCount(g2)).toBe(2);
    const algoEdges = g2.edges.filter((e) => e.from === "algo");
    // `exit` is already there from the seed — we're only counting algo→bt edges
    const toTargets = algoEdges.filter((e) => e.to.startsWith("bt_"));
    expect(toTargets).toHaveLength(2);
    // Default weights are 1 for both
    for (const n of g2.nodes) {
      if (n.kind === "BrokerTarget") expect(n.weight).toBe(1);
    }
  });

  it("throws when graph has no Algorithm node", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "entry", kind: "Entry" },
        { id: "exit", kind: "Exit" },
      ],
      edges: [{ from: "entry", to: "exit", condition: "default" }],
    };
    expect(() => addBrokerTarget(g, "brk", "WEIGHTED_ROUND_ROBIN")).toThrow(/no Algorithm/);
  });
});

describe("builder · addBrokerTarget (Slots-Chance)", () => {
  it("rebalances chance so Σ ≈ 100 after each add", () => {
    const start = newFlowGraph();
    const { graph: g1 } = addBrokerTarget(start, "brk_A", "SLOTS_CHANCE");
    const chance1 = g1.nodes
      .filter((n) => n.kind === "BrokerTarget")
      .map((n) => (n.kind === "BrokerTarget" ? (n.chance ?? 0) : 0));
    expect(chance1.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);

    const { graph: g2 } = addBrokerTarget(g1, "brk_B", "SLOTS_CHANCE");
    const chance2 = g2.nodes
      .filter((n) => n.kind === "BrokerTarget")
      .map((n) => (n.kind === "BrokerTarget" ? (n.chance ?? 0) : 0));
    expect(chance2.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);
    expect(chance2).toHaveLength(2);
  });
});

describe("builder · removeBrokerTarget", () => {
  it("removes the node + incident edges", () => {
    const start = newFlowGraph();
    const { graph: g1, nodeId } = addBrokerTarget(start, "brk_A", "WEIGHTED_ROUND_ROBIN");
    const g2 = removeBrokerTarget(g1, nodeId, "WEIGHTED_ROUND_ROBIN");
    expect(g2.nodes.find((n) => n.id === nodeId)).toBeUndefined();
    expect(g2.edges.some((e) => e.from === nodeId || e.to === nodeId)).toBe(false);
  });

  it("renormalizes chance on Slots-Chance after removal", () => {
    const { graph: g1 } = addBrokerTarget(newFlowGraph(), "brk_A", "SLOTS_CHANCE");
    const { graph: g2, nodeId: id2 } = addBrokerTarget(g1, "brk_B", "SLOTS_CHANCE");
    const { graph: g3 } = addBrokerTarget(g2, "brk_C", "SLOTS_CHANCE");
    const g4 = removeBrokerTarget(g3, id2, "SLOTS_CHANCE");
    const remaining = g4.nodes.filter((n) => n.kind === "BrokerTarget");
    expect(remaining).toHaveLength(2);
    const sum = remaining.reduce((acc, n) => {
      if (n.kind !== "BrokerTarget") return acc;
      return acc + (n.chance ?? 0);
    }, 0);
    expect(sum).toBeCloseTo(100, 1);
  });
});

describe("builder · add + delete Filter/Fallback/Exit", () => {
  it("addFilterNode creates a valid Filter", () => {
    const { graph } = addFilterNode(newFlowGraph());
    expect(graph.nodes.some((n) => n.kind === "Filter")).toBe(true);
    expect(() => FlowGraphSchema.parse(graph)).not.toThrow();
  });

  it("addFallbackNode creates a valid Fallback", () => {
    const { graph } = addFallbackNode(newFlowGraph());
    const fb = graph.nodes.find((n) => n.kind === "Fallback");
    expect(fb).toBeDefined();
    if (fb?.kind === "Fallback") expect(fb.maxHop).toBe(3);
  });

  it("addExitNode creates a second Exit", () => {
    const { graph } = addExitNode(newFlowGraph());
    expect(graph.nodes.filter((n) => n.kind === "Exit")).toHaveLength(2);
  });

  it("deleteNode refuses to delete Entry", () => {
    expect(() => deleteNode(newFlowGraph(), "entry")).toThrow(/cannot delete Entry/);
  });

  it("deleteNode refuses to delete the last Exit", () => {
    expect(() => deleteNode(newFlowGraph(), "exit")).toThrow(/last Exit/);
  });

  it("deleteNode removes a non-protected node and its edges", () => {
    const { graph } = addBrokerTarget(newFlowGraph(), "brk_A", "WEIGHTED_ROUND_ROBIN");
    const afterDel = deleteNode(graph, "bt_1");
    expect(afterDel.nodes.some((n) => n.id === "bt_1")).toBe(false);
    expect(afterDel.edges.some((e) => e.from === "bt_1" || e.to === "bt_1")).toBe(false);
  });
});

describe("builder · addEdge / deleteEdge", () => {
  it("refuses self-loops", () => {
    expect(() => addEdge(newFlowGraph(), { from: "algo", to: "algo" })).toThrow(/self-loops/);
  });

  it("refuses to target Entry or originate from Exit", () => {
    expect(() => addEdge(newFlowGraph(), { from: "algo", to: "entry" })).toThrow(/Entry/);
    expect(() => addEdge(newFlowGraph(), { from: "exit", to: "algo" })).toThrow(/Exit/);
  });

  it("adds an edge when valid and dedupes identical edges", () => {
    const g = newFlowGraph();
    const { graph: withBT, nodeId } = addBrokerTarget(g, "brk", "WEIGHTED_ROUND_ROBIN");
    const once = addEdge(withBT, { from: nodeId, to: "exit" });
    const twice = addEdge(once, { from: nodeId, to: "exit" });
    expect(once.edges.length).toBe(twice.edges.length);
  });

  it("deleteEdge removes the matching edge", () => {
    const g = newFlowGraph();
    const after = deleteEdge(g, { from: "entry", to: "algo" });
    expect(after.edges.some((e) => e.from === "entry" && e.to === "algo")).toBe(false);
  });
});

describe("builder · reachability + publish guard", () => {
  it("reachableFromEntry ignores unconnected nodes", () => {
    const g = newFlowGraph();
    const { graph } = addFilterNode(g); // unconnected
    const reach = reachableFromEntry(graph);
    expect(reach.has("entry")).toBe(true);
    expect(reach.has("algo")).toBe(true);
    expect(reach.has("exit")).toBe(true);
    expect(reach.has("filter_1")).toBe(false);
  });

  it("hasReachableBrokerTarget is false for the empty seed", () => {
    expect(hasReachableBrokerTarget(newFlowGraph())).toBe(false);
  });

  it("hasReachableBrokerTarget is true once a broker target is wired", () => {
    const { graph } = addBrokerTarget(newFlowGraph(), "brk_A", "WEIGHTED_ROUND_ROBIN");
    expect(hasReachableBrokerTarget(graph)).toBe(true);
  });

  it("hasReachableBrokerTarget stays false when the broker target is orphaned", () => {
    const start = newFlowGraph();
    // Manually add an orphan BrokerTarget with no edges
    const orphan: FlowGraph = {
      nodes: [...start.nodes, { id: "bt_x", kind: "BrokerTarget", brokerId: "brk", weight: 1 }],
      edges: start.edges,
    };
    expect(hasReachableBrokerTarget(orphan)).toBe(false);
  });
});
