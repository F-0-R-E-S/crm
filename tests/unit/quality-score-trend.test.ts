import {
  applyAffiliateTrend,
  classifyAffiliateTrend,
  computeQualityScoreWithTrend,
} from "@/server/intake/quality-score";
import { describe, expect, it } from "vitest";

describe("classifyAffiliateTrend", () => {
  it("returns 'flat' when not enough history", () => {
    expect(classifyAffiliateTrend({ avg7d: null, avgPrev7d: null, delta: 0 })).toBe("flat");
    expect(classifyAffiliateTrend({ avg7d: 70, avgPrev7d: null, delta: 0 })).toBe("flat");
  });

  it("returns 'down' when delta < -10 over 7 days", () => {
    expect(classifyAffiliateTrend({ avg7d: 60, avgPrev7d: 75, delta: -15 })).toBe("down");
  });

  it("returns 'up' when stable and high (>=80)", () => {
    expect(classifyAffiliateTrend({ avg7d: 82, avgPrev7d: 81, delta: 1 })).toBe("up");
  });

  it("returns 'flat' for small fluctuations", () => {
    expect(classifyAffiliateTrend({ avg7d: 70, avgPrev7d: 69, delta: 1 })).toBe("flat");
    expect(classifyAffiliateTrend({ avg7d: 60, avgPrev7d: 65, delta: -5 })).toBe("flat");
  });
});

describe("applyAffiliateTrend", () => {
  it("adds -5 for 'down'", () => {
    expect(applyAffiliateTrend(70, "down")).toBe(65);
  });

  it("adds +3 for 'up'", () => {
    expect(applyAffiliateTrend(70, "up")).toBe(73);
  });

  it("no-op for 'flat'", () => {
    expect(applyAffiliateTrend(70, "flat")).toBe(70);
  });

  it("clamps to [0,100]", () => {
    expect(applyAffiliateTrend(2, "down")).toBe(0);
    expect(applyAffiliateTrend(99, "up")).toBe(100);
  });
});

describe("computeQualityScoreWithTrend", () => {
  it("no trend history → identical to base computeQualityScore", () => {
    const r = computeQualityScoreWithTrend({
      fraudScore: 0,
      signalKinds: [],
      affiliate: { leadCount: 0, ftdCount: 0, rejectedCount: 0, avgFraudScore: null },
      brokerGeo: null,
      trend: { avg7d: null, avgPrev7d: null, delta: 0 },
    });
    expect(r.score).toBe(90);
    expect(r.trend).toBe("flat");
    expect(r.trendDelta).toBe(0);
  });

  it("trend='down' drops score by 5", () => {
    const r = computeQualityScoreWithTrend({
      fraudScore: 0,
      signalKinds: [],
      affiliate: { leadCount: 0, ftdCount: 0, rejectedCount: 0, avgFraudScore: null },
      brokerGeo: null,
      trend: { avg7d: 60, avgPrev7d: 75, delta: -15 },
    });
    expect(r.score).toBe(85);
    expect(r.trend).toBe("down");
  });

  it("trend='up' adds 3", () => {
    const r = computeQualityScoreWithTrend({
      fraudScore: 10,
      signalKinds: [],
      affiliate: { leadCount: 0, ftdCount: 0, rejectedCount: 0, avgFraudScore: null },
      brokerGeo: null,
      trend: { avg7d: 82, avgPrev7d: 80, delta: 2 },
    });
    // base: fraud 45 + affiliate 30 + brokerGeo 10 = 85; +3 trend → 88
    expect(r.score).toBe(88);
    expect(r.trend).toBe("up");
  });
});
