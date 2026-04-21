import { describe, expect, it } from "vitest";
import { extractPositions, flowToGraph, graphToFlow } from "./graph";
import { FlowGraphSchema } from "./model";
import { newFlowGraph } from "./seed";

describe("newFlowGraph seed", () => {
  it("validates against FlowGraphSchema", () => {
    const g = newFlowGraph();
    expect(() => FlowGraphSchema.parse(g)).not.toThrow();
  });

  it("contains Entry, Algorithm(WRR), Exit + two edges", () => {
    const g = newFlowGraph();
    expect(g.nodes).toHaveLength(3);
    expect(g.nodes.map((n) => n.kind).sort()).toEqual(["Algorithm", "Entry", "Exit"]);
    const algo = g.nodes.find((n) => n.kind === "Algorithm");
    expect(algo).toBeDefined();
    if (algo?.kind === "Algorithm") expect(algo.mode).toBe("WEIGHTED_ROUND_ROBIN");
    expect(g.edges).toHaveLength(2);
    // Entry → Algorithm → Exit
    expect(g.edges.some((e) => e.from === "entry" && e.to === "algo")).toBe(true);
    expect(g.edges.some((e) => e.from === "algo" && e.to === "exit")).toBe(true);
  });

  it("round-trips cleanly through flowToGraph → graphToFlow", () => {
    const original = newFlowGraph();
    const visual = flowToGraph(original);
    // Visual should have 3 positioned nodes + 2 edges.
    expect(visual.nodes).toHaveLength(3);
    expect(visual.edges).toHaveLength(2);
    // Every visual node must have a finite position.
    for (const n of visual.nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
    // Edge source/target must match the underlying flow's from/to.
    const algoToExit = visual.edges.find((e) => e.source === "algo" && e.target === "exit");
    expect(algoToExit).toBeDefined();
    const entryToAlgo = visual.edges.find((e) => e.source === "entry" && e.target === "algo");
    expect(entryToAlgo).toBeDefined();
    // And round-trip back to the same FlowGraph shape.
    const back = graphToFlow(visual);
    expect(() => FlowGraphSchema.parse(back)).not.toThrow();
    expect(back.nodes.map((n) => n.id).sort()).toEqual(original.nodes.map((n) => n.id).sort());
    expect(back.edges).toEqual(original.edges);
  });

  it("extractPositions returns every node id", () => {
    const visual = flowToGraph(newFlowGraph());
    const pos = extractPositions(visual);
    expect(Object.keys(pos).sort()).toEqual(["algo", "entry", "exit"]);
  });
});
