import { classifyDelta } from "@/components/analytics/DeltaBadge";
import { describe, expect, it } from "vitest";

describe("classifyDelta", () => {
  it("returns 'unknown' for null/undefined/NaN", () => {
    expect(classifyDelta(null)).toBe("unknown");
    expect(classifyDelta(undefined)).toBe("unknown");
    expect(classifyDelta(Number.NaN)).toBe("unknown");
  });

  it("treats small magnitudes as 'flat' (default 0.5 epsilon)", () => {
    expect(classifyDelta(0)).toBe("flat");
    expect(classifyDelta(0.1)).toBe("flat");
    expect(classifyDelta(-0.4)).toBe("flat");
    expect(classifyDelta(0.49)).toBe("flat");
  });

  it("returns 'up' for positive above epsilon, 'down' for negative below", () => {
    expect(classifyDelta(0.6)).toBe("up");
    expect(classifyDelta(42)).toBe("up");
    expect(classifyDelta(-0.6)).toBe("down");
    expect(classifyDelta(-99)).toBe("down");
  });

  it("respects a custom epsilon", () => {
    expect(classifyDelta(1.5, 2)).toBe("flat");
    expect(classifyDelta(2.5, 2)).toBe("up");
  });
});
