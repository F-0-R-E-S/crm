import { decideQuota } from "@/server/billing/plan-gates";
import { PLAN_LIMITS } from "@/server/billing/plans";
import { describe, expect, it } from "vitest";

describe("billing plan-gates — decideQuota", () => {
  it("pro plan (null limit) always allows", () => {
    const res = decideQuota("pro", 999_999_999, 50);
    expect(res.allowed).toBe(true);
    expect(res.limit).toBeNull();
    expect(res.pct).toBe(0);
  });

  it("starter plan rejects when next > limit", () => {
    const limit = PLAN_LIMITS.starter.maxLeadsPerMonth!;
    const res = decideQuota("starter", limit, 1);
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe("plan_quota_exceeded");
    expect(res.limit).toBe(limit);
  });

  it("starter plan accepts exactly at limit", () => {
    const limit = PLAN_LIMITS.starter.maxLeadsPerMonth!;
    const res = decideQuota("starter", limit - 1, 1);
    expect(res.allowed).toBe(true);
    expect(res.used).toBe(limit - 1);
  });

  it("computes pct fraction correctly", () => {
    const res = decideQuota("starter", 25_000, 1);
    expect(res.allowed).toBe(true);
    expect(res.pct).toBeCloseTo(25_001 / 50_000, 5);
  });

  it("growth plan allows batch delta below limit", () => {
    const limit = PLAN_LIMITS.growth.maxLeadsPerMonth!;
    const res = decideQuota("growth", 0, limit);
    expect(res.allowed).toBe(true);
  });

  it("growth plan rejects a batch that overflows", () => {
    const limit = PLAN_LIMITS.growth.maxLeadsPerMonth!;
    const res = decideQuota("growth", 100, limit);
    expect(res.allowed).toBe(false);
  });

  it("trial plan has a 1k cap", () => {
    const res = decideQuota("trial", 999, 2);
    expect(res.allowed).toBe(false);
  });
});
