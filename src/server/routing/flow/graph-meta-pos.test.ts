// Tests for the `meta.pos` round-trip: the visual editor writes user
// drag-end positions to FlowNode.meta.pos, and flowToGraph reads them
// back on reload. These tests pin that behavior so we never silently
// lose layout again.

import { describe, expect, it } from "vitest";
import { flowToGraph, graphToFlow } from "./graph";
import { type FlowGraph, FlowGraphSchema } from "./model";

describe("meta.pos round-trip", () => {
  it("graphToFlow stamps meta.pos from the reactflow position", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b", weight: 1 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    };

    const visual = flowToGraph(flow, {
      e: { x: 11, y: 22 },
      a: { x: 33, y: 44 },
      t: { x: 55, y: 66 },
      x: { x: 77, y: 88 },
    });
    const back = graphToFlow(visual);
    // Every node should have a `meta.pos` written back from the visual
    // state.
    const metaFor = (id: string) =>
      (back.nodes.find((n) => n.id === id) as { meta?: { pos?: { x: number; y: number } } })?.meta
        ?.pos;
    expect(metaFor("e")).toEqual({ x: 11, y: 22 });
    expect(metaFor("a")).toEqual({ x: 33, y: 44 });
    expect(metaFor("t")).toEqual({ x: 55, y: 66 });
    expect(metaFor("x")).toEqual({ x: 77, y: 88 });
    // Persisted shape still validates under FlowGraphSchema.
    expect(FlowGraphSchema.parse(back)).toBeTruthy();
  });

  it("flowToGraph reads meta.pos on the FlowNode when no override is passed", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry", meta: { pos: { x: 100, y: 200 } } },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b", weight: 1 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    } as FlowGraph;

    const v = flowToGraph(flow);
    expect(v.nodes.find((n) => n.id === "e")?.position).toEqual({ x: 100, y: 200 });
  });

  it("explicit positions argument wins over meta.pos (legacy channel still honored)", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry", meta: { pos: { x: 100, y: 200 } } },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b", weight: 1 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    } as FlowGraph;

    const v = flowToGraph(flow, { e: { x: 999, y: 999 } });
    expect(v.nodes.find((n) => n.id === "e")?.position).toEqual({ x: 999, y: 999 });
  });

  it("full round-trip preserves meta.pos through multiple load/save cycles", () => {
    // User opens a flow, drags one node, saves, reopens, drags another,
    // saves. Both positions must survive.
    const flow0: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b", weight: 1 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    };

    // Load #1: user drags `e` to (50, 60).
    const v1 = flowToGraph(flow0);
    v1.nodes = v1.nodes.map((n) => (n.id === "e" ? { ...n, position: { x: 50, y: 60 } } : n));
    const flow1 = graphToFlow(v1);
    expect(
      (flow1.nodes.find((n) => n.id === "e") as { meta?: { pos?: { x: number; y: number } } })?.meta
        ?.pos,
    ).toEqual({ x: 50, y: 60 });

    // Load #2: user reopens, auto-layout reads `e`'s meta.pos. They now
    // drag `a` to (150, 160).
    const v2 = flowToGraph(flow1);
    expect(v2.nodes.find((n) => n.id === "e")?.position).toEqual({ x: 50, y: 60 });
    v2.nodes = v2.nodes.map((n) => (n.id === "a" ? { ...n, position: { x: 150, y: 160 } } : n));
    const flow2 = graphToFlow(v2);
    // `e`'s position survived; `a` got its own.
    expect(
      (flow2.nodes.find((n) => n.id === "e") as { meta?: { pos?: { x: number; y: number } } })?.meta
        ?.pos,
    ).toEqual({ x: 50, y: 60 });
    expect(
      (flow2.nodes.find((n) => n.id === "a") as { meta?: { pos?: { x: number; y: number } } })?.meta
        ?.pos,
    ).toEqual({ x: 150, y: 160 });
  });

  it("graphToFlow with {persistPositions: false} drops meta.pos writes", () => {
    const flow: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b", weight: 1 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    };

    const v = flowToGraph(flow, { e: { x: 11, y: 22 } });
    const back = graphToFlow(v, { persistPositions: false });
    for (const n of back.nodes) {
      expect((n as { meta?: unknown }).meta).toBeUndefined();
    }
  });

  it("preserves other meta fields on round-trip (passthrough)", () => {
    const flow: FlowGraph = {
      nodes: [
        {
          id: "e",
          kind: "Entry",
          meta: { pos: { x: 0, y: 0 }, customNote: "hand-authored" },
        },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b", weight: 1 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    } as FlowGraph;

    const v = flowToGraph(flow);
    v.nodes = v.nodes.map((n) => (n.id === "e" ? { ...n, position: { x: 5, y: 7 } } : n));
    const back = graphToFlow(v);
    const eMeta = (back.nodes.find((n) => n.id === "e") as { meta?: Record<string, unknown> })
      ?.meta;
    expect(eMeta?.customNote).toBe("hand-authored");
    expect(eMeta?.pos).toEqual({ x: 5, y: 7 });
  });
});
