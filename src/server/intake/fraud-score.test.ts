import { describe, expect, it } from "vitest";
import { type FraudPolicyWeights, type FraudSignal, computeFraudScore } from "./fraud-score";

const DEFAULT_POLICY: FraudPolicyWeights = {
  weightBlacklist: 40,
  weightGeoMismatch: 15,
  weightVoip: 20,
  weightDedupHit: 10,
  weightPatternHit: 15,
};

describe("computeFraudScore", () => {
  it("no signals → score 0", () => {
    const r = computeFraudScore([], DEFAULT_POLICY);
    expect(r.score).toBe(0);
    expect(r.fired).toEqual([]);
  });

  it("single blacklist hit → 40", () => {
    const signals: FraudSignal[] = [{ kind: "blacklist", detail: { kind: "IP_EXACT" } }];
    const r = computeFraudScore(signals, DEFAULT_POLICY);
    expect(r.score).toBe(40);
    expect(r.fired).toEqual([{ kind: "blacklist", weight: 40, detail: { kind: "IP_EXACT" } }]);
  });

  it("blacklist + dedup → 40 + 10 = 50", () => {
    const signals: FraudSignal[] = [{ kind: "blacklist" }, { kind: "dedup_hit" }];
    expect(computeFraudScore(signals, DEFAULT_POLICY).score).toBe(50);
  });

  it("all signals fire → cap at 100", () => {
    const signals: FraudSignal[] = [
      { kind: "blacklist" }, // 40
      { kind: "geo_mismatch" }, // 15
      { kind: "voip" }, // 20
      { kind: "dedup_hit" }, // 10
      { kind: "pattern_hit" }, // 15
      // total 100
    ];
    expect(computeFraudScore(signals, DEFAULT_POLICY).score).toBe(100);
  });

  it("over-100 raw sum → clamped to 100", () => {
    const signals: FraudSignal[] = [
      { kind: "blacklist" },
      { kind: "blacklist" },
      { kind: "blacklist" },
    ];
    expect(computeFraudScore(signals, DEFAULT_POLICY).score).toBe(100);
  });

  it("unknown signal kind → ignored", () => {
    const r = computeFraudScore(
      [{ kind: "blacklist" }, { kind: "nonsense" as never }],
      DEFAULT_POLICY,
    );
    expect(r.score).toBe(40);
    expect(r.fired).toHaveLength(1);
  });

  it("policy with zero weights → always 0", () => {
    const zero: FraudPolicyWeights = {
      weightBlacklist: 0,
      weightGeoMismatch: 0,
      weightVoip: 0,
      weightDedupHit: 0,
      weightPatternHit: 0,
    };
    expect(computeFraudScore([{ kind: "blacklist" }, { kind: "voip" }], zero).score).toBe(0);
  });

  it("fired preserves signal order and carries detail", () => {
    const r = computeFraudScore(
      [
        { kind: "geo_mismatch", detail: { expected: "DE", got: "FR" } },
        { kind: "blacklist", detail: { kind: "PHONE_E164", value: "+49170..." } },
      ],
      DEFAULT_POLICY,
    );
    expect(r.fired.map((f) => f.kind)).toEqual(["geo_mismatch", "blacklist"]);
    expect(r.fired[0].detail).toEqual({ expected: "DE", got: "FR" });
    expect(r.fired[1].detail).toEqual({ kind: "PHONE_E164", value: "+49170..." });
  });
});
