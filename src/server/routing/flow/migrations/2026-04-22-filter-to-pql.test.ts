import { describe, expect, it } from "vitest";
import type { FlowGraph } from "../model";
import { migrateFilterNodes } from "./2026-04-22-filter-to-pql";

describe("migrateFilterNodes", () => {
  it("rewrites legacy Filter conditions to canonical rules", () => {
    const legacy = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "f",
          kind: "Filter",
          // biome-ignore lint/suspicious/noExplicitAny: legacy shape tolerated at runtime
          conditions: [{ field: "geo", op: "eq", value: "UA" }] as any,
          logic: "AND",
        },
        { id: "x", kind: "Exit" },
      ],
      edges: [],
    } as unknown as FlowGraph;
    const { graph, rewrittenCount } = migrateFilterNodes(legacy);
    expect(rewrittenCount).toBe(1);
    const filter = graph.nodes.find((n) => n.kind === "Filter");
    if (!filter || filter.kind !== "Filter") throw new Error("expected filter");
    expect(filter.rules).toEqual([
      { field: "geo", sign: "eq", value: "UA", caseSensitive: false },
    ]);
    // Legacy `conditions` key dropped.
    expect((filter as unknown as { conditions?: unknown }).conditions).toBeUndefined();
  });

  it("is idempotent on already-canonical Filter nodes", () => {
    const canonical: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "f",
          kind: "Filter",
          rules: [{ field: "geo", sign: "eq", value: "UA", caseSensitive: false }],
          logic: "AND",
        },
        { id: "x", kind: "Exit" },
      ],
      edges: [],
    };
    const { graph, rewrittenCount } = migrateFilterNodes(canonical);
    expect(rewrittenCount).toBe(0);
    expect(graph).toEqual(canonical);
  });

  it("skips non-Filter nodes", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: "b" },
        { id: "x", kind: "Exit" },
      ],
      edges: [],
    };
    const { rewrittenCount } = migrateFilterNodes(g);
    expect(rewrittenCount).toBe(0);
  });

  it("preserves multi-rule legacy conditions in order", () => {
    const legacy = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "f",
          kind: "Filter",
          // biome-ignore lint/suspicious/noExplicitAny: legacy shape
          conditions: [
            { field: "geo", op: "eq", value: "UA" },
            { field: "utm_source", op: "matches", value: "^google" },
            { field: "subId", op: "in", value: ["aff_a", "aff_b"] },
          ] as any,
          logic: "AND",
        },
        { id: "x", kind: "Exit" },
      ],
      edges: [],
    } as unknown as FlowGraph;
    const { graph, rewrittenCount } = migrateFilterNodes(legacy);
    expect(rewrittenCount).toBe(1);
    const filter = graph.nodes.find((n) => n.kind === "Filter");
    if (!filter || filter.kind !== "Filter") throw new Error("expected filter");
    expect(filter.rules).toHaveLength(3);
    expect(filter.rules[0]?.field).toBe("geo");
    expect(filter.rules[2]?.sign).toBe("in");
  });

  it("handles graph with nested structure (entry + filter + smartpool + targets + exit)", () => {
    const mixed = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "f",
          kind: "Filter",
          // biome-ignore lint/suspicious/noExplicitAny: legacy shape
          conditions: [{ field: "geo", op: "eq", value: "PL" }] as any,
          logic: "AND",
        },
        {
          id: "sp",
          kind: "SmartPool",
          maxHop: 3,
          triggers: {
            timeoutMs: 2000,
            httpStatusCodes: [500],
            connectionError: true,
            explicitReject: true,
          },
        },
        { id: "b1", kind: "BrokerTarget", brokerId: "b1" },
        { id: "x", kind: "Exit" },
      ],
      edges: [],
    } as unknown as FlowGraph;
    const { graph, rewrittenCount } = migrateFilterNodes(mixed);
    expect(rewrittenCount).toBe(1);
    // Non-Filter nodes unchanged.
    expect(graph.nodes.find((n) => n.kind === "SmartPool")).toBeTruthy();
    expect(graph.nodes.find((n) => n.kind === "BrokerTarget")).toBeTruthy();
  });
});
