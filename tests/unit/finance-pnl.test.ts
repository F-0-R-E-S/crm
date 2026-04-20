import { applyRule, resolveRuleAt } from "@/server/finance/payout-rule-resolver";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

const D = (v: string | number) => new Prisma.Decimal(v);

describe("resolveRuleAt", () => {
  const now = new Date("2026-06-15T00:00:00Z");
  const mk = (from: string, to: string | null) => ({
    activeFrom: new Date(from),
    activeTo: to ? new Date(to) : null,
  });

  it("picks most recent overlapping rule", () => {
    const rules = [mk("2026-01-01", null), mk("2026-06-01", null), mk("2026-05-01", "2026-06-10")];
    const r = resolveRuleAt(rules, now);
    expect(r?.activeFrom.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("returns null when no rule is active", () => {
    const r = resolveRuleAt([mk("2027-01-01", null)], now);
    expect(r).toBeNull();
  });
});

describe("applyRule", () => {
  it("CPA_FIXED pays cpaAmount only on FTD", () => {
    const rule = {
      kind: "CPA_FIXED" as const,
      cpaAmount: D(100),
      crgRate: null,
      revShareRate: null,
    };
    expect(applyRule(rule, "FTD", D(0)).toString()).toBe("100");
    expect(applyRule(rule, "REGISTRATION", D(0)).toString()).toBe("0");
    expect(applyRule(rule, "REDEPOSIT", D(500)).toString()).toBe("0");
  });

  it("REV_SHARE pays rate * amount on FTD and REDEPOSIT", () => {
    const rule = {
      kind: "REV_SHARE" as const,
      cpaAmount: null,
      crgRate: null,
      revShareRate: D("0.3"),
    };
    expect(applyRule(rule, "FTD", D(1000)).toString()).toBe("300");
    expect(applyRule(rule, "REDEPOSIT", D(500)).toString()).toBe("150");
    expect(applyRule(rule, "REGISTRATION", D(0)).toString()).toBe("0");
  });

  it("HYBRID pays CPA + rev-share on FTD, rev-share on REDEPOSIT", () => {
    const rule = {
      kind: "HYBRID" as const,
      cpaAmount: D(100),
      crgRate: null,
      revShareRate: D("0.2"),
    };
    expect(applyRule(rule, "FTD", D(500)).toString()).toBe("200"); // 100 + 0.2 * 500
    expect(applyRule(rule, "REDEPOSIT", D(250)).toString()).toBe("50"); // 0.2 * 250
  });
});
