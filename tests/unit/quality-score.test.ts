import { computeQualityScore } from "@/server/intake/quality-score";
import { describe, expect, it } from "vitest";

describe("computeQualityScore", () => {
  it("cold-start: empty affiliate + null brokerGeo + fraudScore=0 → 90", () => {
    const r = computeQualityScore({
      fraudScore: 0,
      signalKinds: [],
      affiliate: { leadCount: 0, ftdCount: 0, rejectedCount: 0, avgFraudScore: null },
      brokerGeo: null,
    });
    expect(r.score).toBe(90);
    expect(r.components.fraudComponent).toBe(50);
    expect(r.components.affiliateComponent).toBe(30);
    expect(r.components.brokerGeoComponent).toBe(10);
  });

  it("max fraud: fraudScore=100 → 40 (0+30+10)", () => {
    const r = computeQualityScore({
      fraudScore: 100,
      signalKinds: ["blacklist"],
      affiliate: { leadCount: 0, ftdCount: 0, rejectedCount: 0, avgFraudScore: null },
      brokerGeo: null,
    });
    expect(r.score).toBe(40);
    expect(r.components.fraudComponent).toBe(0);
    expect(r.components.affiliateComponent).toBe(30);
    expect(r.components.brokerGeoComponent).toBe(10);
  });

  it("strong affiliate: 50 leads, 12 FTD, 2 rejected, fraudScore=20 → 76..80", () => {
    const r = computeQualityScore({
      fraudScore: 20,
      signalKinds: [],
      affiliate: { leadCount: 50, ftdCount: 12, rejectedCount: 2, avgFraudScore: 15 },
      brokerGeo: null,
    });
    expect(r.score).toBeGreaterThanOrEqual(76);
    expect(r.score).toBeLessThanOrEqual(80);
  });

  it("bad broker-GEO fit: fraudScore=10, 100 pushed / 10 accepted → 75..79", () => {
    const r = computeQualityScore({
      fraudScore: 10,
      signalKinds: [],
      affiliate: { leadCount: 0, ftdCount: 0, rejectedCount: 0, avgFraudScore: null },
      brokerGeo: { pushedCount: 100, acceptedCount: 10, acceptanceRate: 0.1 },
    });
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.score).toBeLessThanOrEqual(79);
  });

  it("clamps to [0,100] on extreme inputs", () => {
    const a = computeQualityScore({
      fraudScore: 999,
      signalKinds: [],
      affiliate: {
        leadCount: 1000,
        ftdCount: 0,
        rejectedCount: 1000,
        avgFraudScore: 100,
      },
      brokerGeo: { pushedCount: 1000, acceptedCount: 0, acceptanceRate: 0 },
    });
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);

    const b = computeQualityScore({
      fraudScore: -50,
      signalKinds: [],
      affiliate: { leadCount: 100, ftdCount: 100, rejectedCount: 0, avgFraudScore: 0 },
      brokerGeo: { pushedCount: 100, acceptedCount: 100, acceptanceRate: 1 },
    });
    expect(b.score).toBeGreaterThanOrEqual(0);
    expect(b.score).toBeLessThanOrEqual(100);
  });
});
