import { describe, expect, it } from "vitest";
import type { FlowGraph } from "./model";
import { countLeaves, flowToTree, summarizeTree } from "./tree";

describe("flowToTree", () => {
  it("empty graph with just Entry + Exit → 0 folders", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "x", kind: "Exit" },
      ],
      edges: [{ from: "e", to: "x", condition: "default" }],
    };
    expect(flowToTree(g).folders).toHaveLength(0);
  });

  it("single-broker Algorithm flow surfaces one algorithm folder with one leaf", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "bt", kind: "BrokerTarget", brokerId: "b1", weight: 100 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "bt", condition: "default" },
        { from: "bt", to: "x", condition: "default" },
      ],
    };
    const tree = flowToTree(g);
    expect(tree.folders).toHaveLength(1);
    expect(tree.folders[0]?.kind).toBe("algorithm");
    if (tree.folders[0]?.kind !== "algorithm") throw new Error();
    expect(tree.folders[0].children).toHaveLength(1);
    expect(tree.folders[0].children[0]?.kind).toBe("brokerTarget");
  });

  it("SmartPool flow surfaces the pool as a folder over 3 broker leaves", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "sp",
          kind: "SmartPool",
          maxHop: 3,
          triggers: {
            timeoutMs: 2000,
            httpStatusCodes: [500, 502, 503, 504],
            connectionError: true,
            explicitReject: true,
          },
        },
        { id: "b1", kind: "BrokerTarget", brokerId: "brk1" },
        { id: "b2", kind: "BrokerTarget", brokerId: "brk2" },
        { id: "b3", kind: "BrokerTarget", brokerId: "brk3" },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "sp", condition: "default" },
        { from: "sp", to: "b1", condition: "default" },
        { from: "sp", to: "b2", condition: "default" },
        { from: "sp", to: "b3", condition: "default" },
        { from: "b1", to: "x", condition: "default" },
        { from: "b2", to: "x", condition: "default" },
        { from: "b3", to: "x", condition: "default" },
      ],
    };
    const tree = flowToTree(g);
    expect(tree.folders).toHaveLength(1);
    const f = tree.folders[0];
    if (f?.kind !== "smartPool") throw new Error("expected smartPool");
    expect(f.children).toHaveLength(3);
    expect(countLeaves(f)).toBe(3);
    expect(summarizeTree(tree)).toBe(
      "(smartPool:[bt:brk1],[bt:brk2],[bt:brk3])",
    );
  });

  it("Filter → SmartPool → 3 brokers nests correctly", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "f",
          kind: "Filter",
          rules: [
            { field: "geo", sign: "eq", value: "UA", caseSensitive: false },
          ],
          logic: "AND",
        },
        {
          id: "sp",
          kind: "SmartPool",
          maxHop: 3,
          triggers: {
            timeoutMs: 2000,
            httpStatusCodes: [500, 502, 503, 504],
            connectionError: true,
            explicitReject: true,
          },
        },
        { id: "b1", kind: "BrokerTarget", brokerId: "brkA" },
        { id: "b2", kind: "BrokerTarget", brokerId: "brkB" },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "f", condition: "default" },
        { from: "f", to: "sp", condition: "default" },
        { from: "sp", to: "b1", condition: "default" },
        { from: "sp", to: "b2", condition: "default" },
        { from: "b1", to: "x", condition: "default" },
        { from: "b2", to: "x", condition: "default" },
      ],
    };
    const tree = flowToTree(g);
    expect(summarizeTree(tree)).toBe(
      "(filter:(smartPool:[bt:brkA],[bt:brkB]))",
    );
  });

  it("ComparingSplit surfaces with compareMetric + sampleSize", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "co",
          kind: "ComparingSplit",
          compareMetric: "accept_rate",
          sampleSize: 750,
        },
        { id: "b1", kind: "BrokerTarget", brokerId: "cA" },
        { id: "b2", kind: "BrokerTarget", brokerId: "cB" },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "co", condition: "default" },
        { from: "co", to: "b1", condition: "default" },
        { from: "co", to: "b2", condition: "default" },
        { from: "b1", to: "x", condition: "default" },
        { from: "b2", to: "x", condition: "default" },
      ],
    };
    const tree = flowToTree(g);
    expect(tree.folders).toHaveLength(1);
    const f = tree.folders[0];
    if (f?.kind !== "comparingSplit") throw new Error();
    expect(f.compareMetric).toBe("accept_rate");
    expect(f.sampleSize).toBe(750);
    expect(f.children).toHaveLength(2);
  });

  it("preserves BrokerTarget description + PQL gate flag", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        {
          id: "bt",
          kind: "BrokerTarget",
          brokerId: "b",
          weight: 100,
          description: "premium pool",
          pqlGate: {
            rules: [{ field: "geo", sign: "eq", value: "UA", caseSensitive: false }],
            logic: "AND",
          },
        },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "bt", condition: "default" },
        { from: "bt", to: "x", condition: "default" },
      ],
    };
    const tree = flowToTree(g);
    const f = tree.folders[0];
    if (f?.kind !== "algorithm") throw new Error();
    const leaf = f.children[0];
    if (leaf?.kind !== "brokerTarget") throw new Error();
    expect(leaf.description).toBe("premium pool");
    expect(leaf.hasPqlGate).toBe(true);
  });
});
