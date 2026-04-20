import { describe, expect, it } from "vitest";
import type { FlowGraph } from "./model";
import {
  type CapDefinitionForValidation,
  validateCapDefinitions,
  validateFlowGraph,
} from "./validator";

const ok: FlowGraph = {
  nodes: [
    { id: "e", kind: "Entry" },
    { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "t", kind: "BrokerTarget", brokerId: "b1", weight: 100 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" },
    { from: "a", to: "t", condition: "default" },
    { from: "t", to: "x", condition: "default" },
  ],
};

describe("validateFlowGraph", () => {
  it("valid graph → ok:true, errors=[]", () => {
    const r = validateFlowGraph(ok);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("missing Entry node", () => {
    const g = { ...ok, nodes: ok.nodes.filter((n) => n.kind !== "Entry") };
    const r = validateFlowGraph(g);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "missing_entry")).toBe(true);
  });

  it("missing Exit node", () => {
    const g = { ...ok, nodes: ok.nodes.filter((n) => n.kind !== "Exit") };
    const r = validateFlowGraph(g);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "missing_exit")).toBe(true);
  });

  it("cycle detected — report node_id on cycle edge", () => {
    const g: FlowGraph = {
      ...ok,
      edges: [...ok.edges, { from: "t", to: "a", condition: "default" }],
    };
    const r = validateFlowGraph(g);
    expect(r.ok).toBe(false);
    const cyc = r.errors.find((e) => e.code === "cycle_detected");
    expect(cyc).toBeTruthy();
    expect(cyc?.node_id).toBeTruthy();
  });

  it("dangling edge — to неизвестный node", () => {
    const g: FlowGraph = {
      ...ok,
      edges: [...ok.edges, { from: "a", to: "ghost", condition: "default" }],
    };
    const r = validateFlowGraph(g);
    expect(r.errors.some((e) => e.code === "dangling_edge" && e.node_id === "ghost")).toBe(true);
  });

  it("unreachable node — не достижим из Entry", () => {
    const g: FlowGraph = {
      nodes: [...ok.nodes, { id: "orphan", kind: "Exit" }],
      edges: ok.edges,
    };
    const r = validateFlowGraph(g);
    expect(r.errors.some((e) => e.code === "unreachable_node" && e.node_id === "orphan")).toBe(
      true,
    );
  });
});

describe("validateCapDefinitions", () => {
  const baseCap = (overrides: Partial<CapDefinitionForValidation>): CapDefinitionForValidation => ({
    id: "c1",
    scope: "BROKER",
    scopeRefId: "b1",
    window: "DAILY",
    perCountry: false,
    countryLimits: [],
    ...overrides,
  });

  it("empty list → ok", () => {
    const r = validateCapDefinitions([]);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("perCountry=false без countryLimits → ok (TOTAL cap)", () => {
    const r = validateCapDefinitions([baseCap({ perCountry: false, countryLimits: [] })]);
    expect(r.ok).toBe(true);
  });

  it("perCountry=true + пустой countryLimits → PER_COUNTRY_CAP_HAS_NO_LIMITS", () => {
    const r = validateCapDefinitions([baseCap({ perCountry: true, countryLimits: [] })]);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe("PER_COUNTRY_CAP_HAS_NO_LIMITS");
    expect(r.errors[0].node_id).toBe("b1");
    expect(r.errors[0].message).toContain("perCountry=true");
  });

  it("perCountry=true с хотя бы одной страной → ok", () => {
    const r = validateCapDefinitions([
      baseCap({ perCountry: true, countryLimits: [{ country: "DE", limit: 5 }] }),
    ]);
    expect(r.ok).toBe(true);
  });

  it("несколько перCountry без лимитов → несколько ошибок", () => {
    const r = validateCapDefinitions([
      baseCap({ id: "c1", scopeRefId: "b1", perCountry: true, countryLimits: [] }),
      baseCap({ id: "c2", scopeRefId: "b2", perCountry: true, countryLimits: [] }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(2);
    expect(r.errors.map((e) => e.node_id).sort()).toEqual(["b1", "b2"]);
  });
});
