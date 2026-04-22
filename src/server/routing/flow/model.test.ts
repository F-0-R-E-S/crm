import { describe, expect, it } from "vitest";
import {
  BrokerTargetNodeSchema,
  ComparingSplitNodeSchema,
  FilterNodeSchema,
  type FlowGraph,
  FlowGraphSchema,
  PqlRuleSchema,
  SmartPoolNodeSchema,
} from "./model";

const minimalGraph: FlowGraph = {
  nodes: [
    { id: "entry-1", kind: "Entry" },
    { id: "algo-1", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    {
      id: "t-1",
      kind: "BrokerTarget",
      brokerId: "brk_abc",
      weight: 50,
      active: true,
    },
    {
      id: "t-2",
      kind: "BrokerTarget",
      brokerId: "brk_def",
      weight: 50,
      active: true,
    },
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
        {
          id: "f-1",
          kind: "Filter" as const,
          conditions: [],
          logic: "AND" as const,
        },
      ],
    };
    expect(() => FlowGraphSchema.parse(bad)).toThrow();
  });
});

describe("PqlRuleSchema", () => {
  it("parses a simple eq rule with default case-insensitive", () => {
    const r = PqlRuleSchema.parse({ field: "geo", sign: "eq", value: "UA" });
    expect(r.caseSensitive).toBe(false);
  });

  it("parses a list value for `in`", () => {
    const r = PqlRuleSchema.parse({
      field: "geo",
      sign: "in",
      value: ["UA", "PL"],
      caseSensitive: true,
    });
    expect(r.value).toEqual(["UA", "PL"]);
    expect(r.caseSensitive).toBe(true);
  });

  it("rejects an unknown sign", () => {
    expect(() =>
      PqlRuleSchema.parse({ field: "geo", sign: "sometimes", value: "UA" }),
    ).toThrow();
  });

  it("rejects an unknown field", () => {
    expect(() =>
      PqlRuleSchema.parse({ field: "mysteryField", sign: "eq", value: "UA" }),
    ).toThrow();
  });
});

describe("FilterNode back-compat", () => {
  it("rewrites legacy { conditions, op } shape to { rules, sign } via FlowGraphSchema preprocess", () => {
    const graph = FlowGraphSchema.parse({
      nodes: [
        { id: "entry-1", kind: "Entry" },
        {
          id: "f-legacy",
          kind: "Filter",
          conditions: [{ field: "geo", op: "eq", value: "UA" }],
          logic: "AND",
        },
        { id: "exit-1", kind: "Exit" },
      ],
      edges: [
        { from: "entry-1", to: "f-legacy", condition: "default" },
        { from: "f-legacy", to: "exit-1", condition: "default" },
      ],
    });
    const filter = graph.nodes.find((n) => n.kind === "Filter");
    if (!filter || filter.kind !== "Filter") throw new Error("expected filter");
    expect(filter.rules).toHaveLength(1);
    expect(filter.rules[0]?.sign).toBe("eq");
    expect(filter.rules[0]?.caseSensitive).toBe(false);
  });

  it("accepts the new { rules, sign, caseSensitive } shape unchanged", () => {
    const node = FilterNodeSchema.parse({
      id: "f-new",
      kind: "Filter",
      rules: [
        {
          field: "phone",
          sign: "starts_with",
          value: "+380",
          caseSensitive: true,
        },
      ],
      logic: "AND",
    });
    expect(node.rules[0]?.sign).toBe("starts_with");
    expect(node.rules[0]?.caseSensitive).toBe(true);
  });
});

describe("BrokerTargetNodeSchema (extended)", () => {
  it("leaves active undefined when omitted (engine treats undefined as active)", () => {
    const n = BrokerTargetNodeSchema.parse({
      id: "t",
      kind: "BrokerTarget",
      brokerId: "brk_1",
      weight: 10,
    });
    expect(n.active).toBeUndefined();
  });

  it("accepts an optional pqlGate", () => {
    const n = BrokerTargetNodeSchema.parse({
      id: "t",
      kind: "BrokerTarget",
      brokerId: "brk_1",
      weight: 10,
      pqlGate: {
        rules: [{ field: "hourOfDay", sign: "gte", value: 10 }],
        logic: "AND",
      },
    });
    expect(n.pqlGate?.rules).toHaveLength(1);
  });
});

describe("SmartPoolNodeSchema", () => {
  it("parses with default maxHop=5 and full triggers", () => {
    const n = SmartPoolNodeSchema.parse({
      id: "sp-1",
      kind: "SmartPool",
      triggers: {
        timeoutMs: 2000,
        httpStatusCodes: [500, 502],
        connectionError: true,
        explicitReject: true,
      },
    });
    expect(n.maxHop).toBe(5);
  });

  it("rejects maxHop > 10", () => {
    expect(() =>
      SmartPoolNodeSchema.parse({
        id: "sp-1",
        kind: "SmartPool",
        maxHop: 11,
        triggers: {
          timeoutMs: 2000,
          httpStatusCodes: [500],
          connectionError: true,
          explicitReject: true,
        },
      }),
    ).toThrow();
  });
});

describe("ComparingSplitNodeSchema", () => {
  it("parses with valid compareMetric + sampleSize", () => {
    const n = ComparingSplitNodeSchema.parse({
      id: "co-1",
      kind: "ComparingSplit",
      compareMetric: "push_rate",
      sampleSize: 1000,
    });
    expect(n.compareMetric).toBe("push_rate");
  });

  it("rejects unknown compareMetric", () => {
    expect(() =>
      ComparingSplitNodeSchema.parse({
        id: "co-1",
        kind: "ComparingSplit",
        compareMetric: "clicks",
        sampleSize: 500,
      }),
    ).toThrow();
  });

  it("rejects sampleSize below 50", () => {
    expect(() =>
      ComparingSplitNodeSchema.parse({
        id: "co-1",
        kind: "ComparingSplit",
        compareMetric: "push_rate",
        sampleSize: 10,
      }),
    ).toThrow();
  });
});

describe("FlowGraph with new node kinds", () => {
  it("accepts a graph containing SmartPool + ComparingSplit + PQL-gated target", () => {
    const g = FlowGraphSchema.parse({
      nodes: [
        { id: "entry-1", kind: "Entry" },
        {
          id: "f-1",
          kind: "Filter",
          rules: [{ field: "geo", sign: "eq", value: "UA" }],
          logic: "AND",
        },
        {
          id: "sp-1",
          kind: "SmartPool",
          maxHop: 3,
          triggers: {
            timeoutMs: 2000,
            httpStatusCodes: [500, 502, 503, 504],
            connectionError: true,
            explicitReject: true,
          },
        },
        {
          id: "co-1",
          kind: "ComparingSplit",
          compareMetric: "accept_rate",
          sampleSize: 500,
        },
        {
          id: "bt-1",
          kind: "BrokerTarget",
          brokerId: "brk_a",
          weight: 1,
          pqlGate: {
            rules: [
              { field: "hourOfDay", sign: "gte", value: 8 },
              { field: "hourOfDay", sign: "lte", value: 18 },
            ],
            logic: "AND",
          },
        },
        { id: "exit-1", kind: "Exit" },
      ],
      edges: [
        { from: "entry-1", to: "f-1", condition: "default" },
        { from: "f-1", to: "sp-1", condition: "default" },
        { from: "sp-1", to: "bt-1", condition: "default" },
        { from: "co-1", to: "bt-1", condition: "default" },
        { from: "bt-1", to: "exit-1", condition: "default" },
      ],
    });
    expect(g.nodes).toHaveLength(6);
  });
});
