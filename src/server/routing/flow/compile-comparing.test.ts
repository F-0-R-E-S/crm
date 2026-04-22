import { describe, expect, it } from "vitest";
import { ComparingCompileError, comparingSplitToAlgoConfig } from "./compile-comparing";
import type { ComparingSplitNode } from "./model";

const mkNode = (overrides: Partial<ComparingSplitNode> = {}): ComparingSplitNode => ({
  id: "co_1",
  kind: "ComparingSplit",
  compareMetric: "push_rate",
  sampleSize: 500,
  ...overrides,
});

describe("comparingSplitToAlgoConfig", () => {
  it("50/50 split → weights 500/500", () => {
    const r = comparingSplitToAlgoConfig(mkNode(), [
      { nodeId: "a", share: 0.5 },
      { nodeId: "b", share: 0.5 },
    ]);
    expect(r.weights).toEqual([
      { nodeId: "a", weight: 500 },
      { nodeId: "b", weight: 500 },
    ]);
  });

  it("30/30/40 split → weights 300/300/400", () => {
    const r = comparingSplitToAlgoConfig(mkNode(), [
      { nodeId: "a", share: 0.3 },
      { nodeId: "b", share: 0.3 },
      { nodeId: "c", share: 0.4 },
    ]);
    expect(r.weights.map((w) => w.weight)).toEqual([300, 300, 400]);
  });

  it("produces an Algorithm(WRR) node id derived from the source node", () => {
    const r = comparingSplitToAlgoConfig(mkNode({ id: "co_abc" }), [
      { nodeId: "a", share: 0.5 },
      { nodeId: "b", share: 0.5 },
    ]);
    expect(r.algoNode.id).toBe("co_abc_wrr");
    expect(r.algoNode.kind).toBe("Algorithm");
    expect(r.algoNode.mode).toBe("WEIGHTED_ROUND_ROBIN");
  });

  it("config payload carries metric + sampleSize + source id + branches", () => {
    const r = comparingSplitToAlgoConfig(
      mkNode({ compareMetric: "ftd_rate", sampleSize: 1000 }),
      [
        { nodeId: "a", share: 0.5 },
        { nodeId: "b", share: 0.5 },
      ],
    );
    expect(r.algoConfigParams).toMatchObject({
      compareMetric: "ftd_rate",
      sampleSize: 1000,
      isComparison: true,
      sourceComparingNodeId: "co_1",
    });
  });

  it("rejects fewer than 2 branches", () => {
    expect(() => comparingSplitToAlgoConfig(mkNode(), [{ nodeId: "a", share: 1 }])).toThrow(
      ComparingCompileError,
    );
  });

  it("rejects more than 4 branches", () => {
    expect(() =>
      comparingSplitToAlgoConfig(mkNode(), [
        { nodeId: "a", share: 0.2 },
        { nodeId: "b", share: 0.2 },
        { nodeId: "c", share: 0.2 },
        { nodeId: "d", share: 0.2 },
        { nodeId: "e", share: 0.2 },
      ]),
    ).toThrow(ComparingCompileError);
  });

  it("rejects unbalanced shares (sum < 0.999)", () => {
    expect(() =>
      comparingSplitToAlgoConfig(mkNode(), [
        { nodeId: "a", share: 0.3 },
        { nodeId: "b", share: 0.3 },
      ]),
    ).toThrow(/sum to 1/);
  });

  it("rejects share <= 0", () => {
    expect(() =>
      comparingSplitToAlgoConfig(mkNode(), [
        { nodeId: "a", share: 0 },
        { nodeId: "b", share: 1 },
      ]),
    ).toThrow(/> 0/);
  });

  it("accepts shares that sum to 1 ± 0.001 tolerance (rounding safe)", () => {
    const r = comparingSplitToAlgoConfig(mkNode(), [
      { nodeId: "a", share: 0.3334 },
      { nodeId: "b", share: 0.3333 },
      { nodeId: "c", share: 0.3333 },
    ]);
    expect(r.weights.map((w) => w.weight)).toEqual([333, 333, 333]);
  });
});
