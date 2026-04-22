import { describe, expect, it } from "vitest";
import { detectFallbackCycle } from "../fallback/orchestrator";
import { smartPoolToFallbackSteps } from "./compile-smartpool";
import type { SmartPoolNode } from "./model";

const mkPool = (maxHop = 5): SmartPoolNode => ({
  id: "sp_1",
  kind: "SmartPool",
  maxHop,
  triggers: {
    timeoutMs: 2000,
    httpStatusCodes: [500, 502, 503, 504],
    connectionError: true,
    explicitReject: true,
  },
});

describe("smartPoolToFallbackSteps", () => {
  it("empty children → no steps, primary=null", () => {
    const r = smartPoolToFallbackSteps(mkPool(), []);
    expect(r.steps).toHaveLength(0);
    expect(r.primaryNodeId).toBeNull();
  });

  it("single child → primary set, no steps (nothing to fall over to)", () => {
    const r = smartPoolToFallbackSteps(mkPool(), ["b1"]);
    expect(r.primaryNodeId).toBe("b1");
    expect(r.steps).toHaveLength(0);
  });

  it("three children → primary=b1, two hops (b1→b2, b2→b3)", () => {
    const r = smartPoolToFallbackSteps(mkPool(), ["b1", "b2", "b3"]);
    expect(r.primaryNodeId).toBe("b1");
    expect(r.steps).toHaveLength(2);
    expect(r.steps[0]).toMatchObject({ fromNodeId: "b1", toNodeId: "b2", hopOrder: 0 });
    expect(r.steps[1]).toMatchObject({ fromNodeId: "b2", toNodeId: "b3", hopOrder: 1 });
  });

  it("maxHop=1 only emits one hop regardless of child count", () => {
    const r = smartPoolToFallbackSteps(mkPool(1), ["b1", "b2", "b3", "b4"]);
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0]).toMatchObject({ fromNodeId: "b1", toNodeId: "b2" });
  });

  it("maxHop=10 with 3 children still only emits 2 hops (child-count ceiling)", () => {
    const r = smartPoolToFallbackSteps(mkPool(10), ["b1", "b2", "b3"]);
    expect(r.steps).toHaveLength(2);
  });

  it("triggers propagate unchanged to every step", () => {
    const pool = mkPool();
    const r = smartPoolToFallbackSteps(pool, ["b1", "b2", "b3"]);
    for (const step of r.steps) {
      expect(step.triggers).toEqual(pool.triggers);
    }
  });

  it("produces a cycle-free chain that passes detectFallbackCycle", () => {
    const r = smartPoolToFallbackSteps(mkPool(), ["a", "b", "c", "d", "e"]);
    const verdict = detectFallbackCycle(r.steps);
    expect(verdict.ok).toBe(true);
  });

  it("duplicate children in ranked list still produce a cycle-detectable chain", () => {
    // Compiler itself does not de-dupe (caller's responsibility); the
    // cycle detector is the safety net.
    const r = smartPoolToFallbackSteps(mkPool(), ["a", "b", "a"]);
    const verdict = detectFallbackCycle(r.steps);
    expect(verdict.ok).toBe(false);
  });
});
