import { computeTimeToFirstLead } from "@/server/onboarding/metrics";
import { describe, expect, it } from "vitest";

describe("computeTimeToFirstLead", () => {
  it("computes median + p90 on a 10-sample series", () => {
    const samples = [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000];
    const r = computeTimeToFirstLead(samples);
    expect(r.count).toBe(10);
    expect(r.medianSeconds).toBe(1650);
    expect(r.p90Seconds).toBeGreaterThanOrEqual(2700);
  });

  it("returns zeros for empty input", () => {
    const r = computeTimeToFirstLead([]);
    expect(r).toEqual({ count: 0, medianSeconds: 0, p90Seconds: 0 });
  });
});
