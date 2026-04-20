import { describe, expect, it } from "vitest";
import { type FlowGraph, FlowGraphSchema } from "./model";

const minimalGraph: FlowGraph = {
  nodes: [
    { id: "entry-1", kind: "Entry" },
    { id: "algo-1", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "t-1", kind: "BrokerTarget", brokerId: "brk_abc", weight: 50 },
    { id: "t-2", kind: "BrokerTarget", brokerId: "brk_def", weight: 50 },
    { id: "exit-1", kind: "Exit" },
  ],
  edges: [
    { from: "entry-1", to: "algo-1", condition: "default" },
    { from: "algo-1", to: "t-1", condition: "default" },
    { from: "algo-1", to: "t-2", condition: "default" },
    { from: "t-1", to: "exit-1", condition: "default" },
    { from: "t-2", to: "exit-1", condition: "default" },
  ],
};

describe("FlowGraphSchema", () => {
  it("принимает минимальный валидный граф", () => {
    expect(FlowGraphSchema.parse(minimalGraph)).toBeTruthy();
  });

  it("422 на дубликат node.id", () => {
    const bad = {
      ...minimalGraph,
      nodes: [...minimalGraph.nodes, { id: "entry-1", kind: "Exit" as const }],
    };
    expect(() => FlowGraphSchema.parse(bad)).toThrow();
  });

  it("422 на BrokerTarget без brokerId", () => {
    const bad = {
      ...minimalGraph,
      nodes: [
        ...minimalGraph.nodes.slice(0, -1),
        { id: "x", kind: "BrokerTarget", weight: 10 } as unknown as FlowGraph["nodes"][number],
        minimalGraph.nodes.at(-1) as FlowGraph["nodes"][number],
      ],
    };
    expect(() => FlowGraphSchema.parse(bad)).toThrow();
  });

  it("422 на Filter с пустым набором условий", () => {
    const bad = {
      ...minimalGraph,
      nodes: [
        ...minimalGraph.nodes,
        { id: "f-1", kind: "Filter" as const, conditions: [], logic: "AND" as const },
      ],
    };
    expect(() => FlowGraphSchema.parse(bad)).toThrow();
  });
});
