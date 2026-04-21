import { describe, expect, it } from "vitest";
import { extractPositions, flowToGraph, graphToFlow } from "./graph";
import type { FlowGraph } from "./model";
import { FlowGraphSchema } from "./model";

function assertRoundTrip(name: string, flow: FlowGraph) {
  const visual = flowToGraph(flow);
  const back = graphToFlow(visual);
  // Round-trip must preserve the persistence shape, including node kinds
  // and edge conditions. Positions live in the visual graph only.
  expect(FlowGraphSchema.parse(back), `${name} — graph schema`).toBeTruthy();
  expect(back.nodes.map((n) => n.id).sort()).toEqual(flow.nodes.map((n) => n.id).sort());
  expect(back.edges).toEqual(flow.edges);
}

describe("flowToGraph / graphToFlow round-trip", () => {
  it("minimal single-broker WRR flow", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "entry-1", kind: "Entry" },
        { id: "algo-1", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t-1", kind: "BrokerTarget", brokerId: "brk_abc", weight: 100 },
        { id: "exit-1", kind: "Exit" },
      ],
      edges: [
        { from: "entry-1", to: "algo-1", condition: "default" },
        { from: "algo-1", to: "t-1", condition: "default" },
        { from: "t-1", to: "exit-1", condition: "default" },
      ],
    };
    assertRoundTrip("minimal", flow);
    const visual = flowToGraph(flow);
    expect(visual.nodes.find((n) => n.id === "entry-1")?.type).toBe("entry");
    expect(visual.nodes.find((n) => n.id === "algo-1")?.type).toBe("algorithm");
    expect(visual.nodes.find((n) => n.id === "t-1")?.type).toBe("brokerTarget");
  });

  it("multi-broker Slots-Chance with filter", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry", label: "intake" },
        {
          id: "f1",
          kind: "Filter",
          conditions: [{ field: "geo", op: "in", value: ["UA", "PL"] }],
          logic: "AND",
        },
        { id: "alg", kind: "Algorithm", mode: "SLOTS_CHANCE" },
        { id: "b1", kind: "BrokerTarget", brokerId: "b-alpha", chance: 50 },
        { id: "b2", kind: "BrokerTarget", brokerId: "b-beta", chance: 30 },
        { id: "b3", kind: "BrokerTarget", brokerId: "b-gamma", chance: 20 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "f1", condition: "default" },
        { from: "f1", to: "alg", condition: "default" },
        { from: "alg", to: "b1", condition: "default" },
        { from: "alg", to: "b2", condition: "default" },
        { from: "alg", to: "b3", condition: "default" },
        { from: "b1", to: "x", condition: "default" },
        { from: "b2", to: "x", condition: "default" },
        { from: "b3", to: "x", condition: "default" },
      ],
    };
    assertRoundTrip("slots-chance", flow);
  });

  it("fallback chain with on_fail edges", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "alg", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "b1", kind: "BrokerTarget", brokerId: "primary", weight: 100 },
        {
          id: "fb",
          kind: "Fallback",
          maxHop: 3,
          triggers: {
            timeoutMs: 2000,
            httpStatusCodes: [500, 502, 503],
            connectionError: true,
            explicitReject: true,
          },
        },
        { id: "b2", kind: "BrokerTarget", brokerId: "backup", weight: 100 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "alg", condition: "default" },
        { from: "alg", to: "b1", condition: "default" },
        { from: "b1", to: "fb", condition: "on_fail" },
        { from: "fb", to: "b2", condition: "default" },
        { from: "b1", to: "x", condition: "on_success" },
        { from: "b2", to: "x", condition: "default" },
      ],
    };
    assertRoundTrip("fallback", flow);
    const visual = flowToGraph(flow);
    const onFail = visual.edges.find((e) => e.source === "b1" && e.target === "fb");
    expect(onFail?.label).toBe("on_fail");
    expect(onFail?.data.condition).toBe("on_fail");
  });

  it("two parallel branches (logical OR of filters)", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "fa",
          kind: "Filter",
          conditions: [{ field: "geo", op: "eq", value: "UA" }],
          logic: "AND",
        },
        {
          id: "fb",
          kind: "Filter",
          conditions: [{ field: "geo", op: "eq", value: "PL" }],
          logic: "AND",
        },
        { id: "alg_ua", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "alg_pl", kind: "Algorithm", mode: "SLOTS_CHANCE" },
        { id: "t_ua", kind: "BrokerTarget", brokerId: "ua", weight: 100 },
        { id: "t_pl", kind: "BrokerTarget", brokerId: "pl", chance: 100 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "fa", condition: "default" },
        { from: "e", to: "fb", condition: "default" },
        { from: "fa", to: "alg_ua", condition: "default" },
        { from: "fb", to: "alg_pl", condition: "default" },
        { from: "alg_ua", to: "t_ua", condition: "default" },
        { from: "alg_pl", to: "t_pl", condition: "default" },
        { from: "t_ua", to: "x", condition: "default" },
        { from: "t_pl", to: "x", condition: "default" },
      ],
    };
    assertRoundTrip("parallel-branches", flow);
  });

  it("preserves position overrides and can extract them", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "alg", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b", weight: 100 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "alg", condition: "default" },
        { from: "alg", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    };
    const positions = {
      e: { x: 42, y: 13 },
      alg: { x: 200, y: 13 },
    };
    const visual = flowToGraph(flow, positions);
    expect(visual.nodes.find((n) => n.id === "e")?.position).toEqual({ x: 42, y: 13 });
    expect(visual.nodes.find((n) => n.id === "alg")?.position).toEqual({ x: 200, y: 13 });

    const extracted = extractPositions(visual);
    expect(extracted.e).toEqual({ x: 42, y: 13 });
    expect(extracted.alg).toEqual({ x: 200, y: 13 });
    expect(extracted.t).toBeDefined();
    expect(extracted.x).toBeDefined();
  });
});
