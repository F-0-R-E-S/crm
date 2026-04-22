// Diff-test: 5 real-shape v1.0 flows round-trip through flowToGraph →
// graphToFlow without corruption.
//
// These fixtures mirror the shapes our auto-migration emits + the ones
// used across the flow-graph test suite (minimal single-broker, multi-
// broker Slots-Chance, fallback chain, two parallel filter branches,
// chained filters with AND/OR).
//
// Strict byte-equality is asserted when we opt out of position
// persistence (the layout round-trip is tested separately in
// graph-meta-pos.test.ts). With default options, we assert structural
// equality: same node ids, same per-node kind + payload (minus meta),
// same edges in the same order.

import { describe, expect, it } from "vitest";
import { flowToGraph, graphToFlow } from "./graph";
import { type FlowGraph, FlowGraphSchema } from "./model";

function stripMeta(g: FlowGraph): FlowGraph {
  return {
    ...g,
    nodes: g.nodes.map((n) => {
      const { meta: _meta, ...rest } = n as typeof n & { meta?: unknown };
      return rest as typeof n;
    }),
  };
}

function byteEqual(a: FlowGraph, b: FlowGraph) {
  // Deterministic stringify: we don't reorder keys because every object
  // in our fixtures is already written in a consistent key order.
  expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
}

// ──────────────────────────────────────────────────────────────────────
// Fixtures — 5 representative shapes observed in the wild.
// ──────────────────────────────────────────────────────────────────────

// 1. The minimum shape auto-migrate produces for a single-broker GEO.
const FIX_AUTO_MIGRATE_SINGLE: FlowGraph = {
  nodes: [
    { id: "e", kind: "Entry" },
    {
      id: "f",
      kind: "Filter",
      rules: [{ field: "geo", sign: "eq", value: "UA", caseSensitive: false }],
      logic: "AND",
    },
    { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "t-brk_ua1", kind: "BrokerTarget", brokerId: "brk_ua1", weight: 100 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "f", condition: "default" },
    { from: "f", to: "a", condition: "default" },
    { from: "a", to: "t-brk_ua1", condition: "default" },
    { from: "t-brk_ua1", to: "x", condition: "default" },
  ],
};

// 2. Multi-broker WRR pool with 4 targets.
const FIX_WRR_FOUR: FlowGraph = {
  nodes: [
    { id: "e", kind: "Entry" },
    { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "t1", kind: "BrokerTarget", brokerId: "b1", weight: 50 },
    { id: "t2", kind: "BrokerTarget", brokerId: "b2", weight: 30 },
    { id: "t3", kind: "BrokerTarget", brokerId: "b3", weight: 15 },
    { id: "t4", kind: "BrokerTarget", brokerId: "b4", weight: 5 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" },
    { from: "a", to: "t1", condition: "default" },
    { from: "a", to: "t2", condition: "default" },
    { from: "a", to: "t3", condition: "default" },
    { from: "a", to: "t4", condition: "default" },
    { from: "t1", to: "x", condition: "default" },
    { from: "t2", to: "x", condition: "default" },
    { from: "t3", to: "x", condition: "default" },
    { from: "t4", to: "x", condition: "default" },
  ],
};

// 3. Slots-Chance with three brokers summing to 100%.
const FIX_SLOTS_CHANCE_THREE: FlowGraph = {
  nodes: [
    { id: "e", kind: "Entry" },
    {
      id: "f",
      kind: "Filter",
      rules: [
        { field: "geo", sign: "in", value: ["UA", "PL", "CZ"], caseSensitive: false },
      ],
      logic: "AND",
    },
    { id: "a", kind: "Algorithm", mode: "SLOTS_CHANCE" },
    { id: "b_a", kind: "BrokerTarget", brokerId: "broker_alpha", chance: 50 },
    { id: "b_b", kind: "BrokerTarget", brokerId: "broker_beta", chance: 30 },
    { id: "b_c", kind: "BrokerTarget", brokerId: "broker_gamma", chance: 20 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "f", condition: "default" },
    { from: "f", to: "a", condition: "default" },
    { from: "a", to: "b_a", condition: "default" },
    { from: "a", to: "b_b", condition: "default" },
    { from: "a", to: "b_c", condition: "default" },
    { from: "b_a", to: "x", condition: "default" },
    { from: "b_b", to: "x", condition: "default" },
    { from: "b_c", to: "x", condition: "default" },
  ],
};

// 4. Fallback chain with on_success / on_fail edges (two-hop).
const FIX_FALLBACK_CHAIN: FlowGraph = {
  nodes: [
    { id: "e", kind: "Entry" },
    { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "primary", kind: "BrokerTarget", brokerId: "broker_primary", weight: 100 },
    {
      id: "fb1",
      kind: "Fallback",
      maxHop: 3,
      triggers: {
        timeoutMs: 2000,
        httpStatusCodes: [500, 502, 503, 504],
        connectionError: true,
        explicitReject: true,
      },
    },
    { id: "secondary", kind: "BrokerTarget", brokerId: "broker_secondary", weight: 100 },
    {
      id: "fb2",
      kind: "Fallback",
      maxHop: 2,
      triggers: {
        timeoutMs: 3000,
        httpStatusCodes: [500, 502, 503],
        connectionError: true,
        explicitReject: false,
      },
    },
    { id: "tertiary", kind: "BrokerTarget", brokerId: "broker_tertiary", weight: 100 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" },
    { from: "a", to: "primary", condition: "default" },
    { from: "primary", to: "x", condition: "on_success" },
    { from: "primary", to: "fb1", condition: "on_fail" },
    { from: "fb1", to: "secondary", condition: "default" },
    { from: "secondary", to: "x", condition: "on_success" },
    { from: "secondary", to: "fb2", condition: "on_fail" },
    { from: "fb2", to: "tertiary", condition: "default" },
    { from: "tertiary", to: "x", condition: "default" },
  ],
};

// 5. Two parallel filter branches (OR-of-GEOs split) with separate
//    algorithm pools. Common for high-volume multi-GEO ops teams.
const FIX_PARALLEL_BRANCHES: FlowGraph = {
  nodes: [
    { id: "e", kind: "Entry" },
    {
      id: "f_ua",
      kind: "Filter",
      rules: [
        { field: "geo", sign: "eq", value: "UA", caseSensitive: false },
        { field: "utm_source", sign: "matches", value: "^google", caseSensitive: false },
      ],
      logic: "AND",
    },
    {
      id: "f_pl",
      kind: "Filter",
      rules: [{ field: "geo", sign: "in", value: ["PL", "CZ"], caseSensitive: false }],
      logic: "OR",
    },
    { id: "a_ua", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "a_pl", kind: "Algorithm", mode: "SLOTS_CHANCE" },
    { id: "t_ua1", kind: "BrokerTarget", brokerId: "ua_broker_1", weight: 60 },
    { id: "t_ua2", kind: "BrokerTarget", brokerId: "ua_broker_2", weight: 40 },
    { id: "t_pl1", kind: "BrokerTarget", brokerId: "pl_broker_1", chance: 70 },
    { id: "t_pl2", kind: "BrokerTarget", brokerId: "pl_broker_2", chance: 30 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "f_ua", condition: "default" },
    { from: "e", to: "f_pl", condition: "default" },
    { from: "f_ua", to: "a_ua", condition: "default" },
    { from: "f_pl", to: "a_pl", condition: "default" },
    { from: "a_ua", to: "t_ua1", condition: "default" },
    { from: "a_ua", to: "t_ua2", condition: "default" },
    { from: "a_pl", to: "t_pl1", condition: "default" },
    { from: "a_pl", to: "t_pl2", condition: "default" },
    { from: "t_ua1", to: "x", condition: "default" },
    { from: "t_ua2", to: "x", condition: "default" },
    { from: "t_pl1", to: "x", condition: "default" },
    { from: "t_pl2", to: "x", condition: "default" },
  ],
};

const FIXTURES: Array<{ name: string; graph: FlowGraph }> = [
  { name: "auto-migrate-single", graph: FIX_AUTO_MIGRATE_SINGLE },
  { name: "wrr-four-brokers", graph: FIX_WRR_FOUR },
  { name: "slots-chance-three", graph: FIX_SLOTS_CHANCE_THREE },
  { name: "fallback-chain-two-hop", graph: FIX_FALLBACK_CHAIN },
  { name: "parallel-filter-branches", graph: FIX_PARALLEL_BRANCHES },
];

describe("graph-diff — 5 real v1.0 flows round-trip", () => {
  for (const { name, graph } of FIXTURES) {
    it(`${name}: survives Zod validation`, () => {
      expect(FlowGraphSchema.parse(graph)).toBeTruthy();
    });

    it(`${name}: byte-equal JSON round-trip when positions are not persisted`, () => {
      const visual = flowToGraph(graph);
      const back = graphToFlow(visual, { persistPositions: false });
      byteEqual(graph, back);
    });

    it(`${name}: structural equality (ignoring meta) with default options`, () => {
      const visual = flowToGraph(graph);
      const back = graphToFlow(visual);
      const stripped = stripMeta(back);
      byteEqual(graph, stripped);
      // Every node has a meta.pos set after round-trip.
      for (const n of back.nodes) {
        const meta = (n as { meta?: { pos?: { x: number; y: number } } }).meta;
        expect(meta?.pos).toBeDefined();
        expect(typeof meta?.pos?.x).toBe("number");
        expect(typeof meta?.pos?.y).toBe("number");
      }
    });

    it(`${name}: edges round-trip in insertion order`, () => {
      const visual = flowToGraph(graph);
      const back = graphToFlow(visual);
      expect(back.edges).toEqual(graph.edges);
    });

    it(`${name}: node count + id set are preserved`, () => {
      const visual = flowToGraph(graph);
      const back = graphToFlow(visual);
      expect(back.nodes.length).toEqual(graph.nodes.length);
      expect(new Set(back.nodes.map((n) => n.id))).toEqual(new Set(graph.nodes.map((n) => n.id)));
    });
  }
});
