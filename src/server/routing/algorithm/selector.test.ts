import { describe, expect, it } from "vitest";
import { resolveAlgorithm } from "./selector";

describe("resolveAlgorithm", () => {
  it("при override на branch — используется branch-уровень", () => {
    const r = resolveAlgorithm({
      flowAlgorithm: { mode: "WEIGHTED_ROUND_ROBIN", params: {} },
      branchAlgorithm: { mode: "SLOTS_CHANCE", params: {} },
    });
    expect(r.mode).toBe("SLOTS_CHANCE");
    expect(r.source).toBe("branch");
  });

  it("без override — используется flow-уровень", () => {
    const r = resolveAlgorithm({
      flowAlgorithm: { mode: "WEIGHTED_ROUND_ROBIN", params: {} },
      branchAlgorithm: null,
    });
    expect(r.mode).toBe("WEIGHTED_ROUND_ROBIN");
    expect(r.source).toBe("flow");
  });

  it("throws если flow не задан и branch не override", () => {
    expect(() => resolveAlgorithm({ flowAlgorithm: null, branchAlgorithm: null })).toThrow(
      /algorithm_not_configured/,
    );
  });
});
