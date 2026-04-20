import { Prisma } from "@prisma/client";
import type { AffiliatePayoutRule, BrokerPayoutRule, ConversionKind } from "@prisma/client";

/**
 * Pick the payout rule active at `at` from a list. If multiple rules
 * overlap, the most recent `activeFrom` wins (caller is expected to
 * disallow overlapping rules in the editor; this is a defence-in-depth
 * resolver).
 */
export function resolveRuleAt<T extends { activeFrom: Date; activeTo: Date | null }>(
  rules: T[],
  at: Date,
): T | null {
  const active = rules
    .filter((r) => r.activeFrom <= at && (r.activeTo === null || r.activeTo > at))
    .sort((a, b) => b.activeFrom.getTime() - a.activeFrom.getTime());
  return active[0] ?? null;
}

/**
 * Affiliate rule resolution: prefer a rule scoped to the specific broker,
 * fall back to the broker-agnostic rule.
 */
export function resolveAffiliateRuleAt(
  rules: AffiliatePayoutRule[],
  brokerId: string,
  at: Date,
): AffiliatePayoutRule | null {
  const scoped = rules.filter((r) => r.brokerId === brokerId);
  const global = rules.filter((r) => r.brokerId === null);
  return resolveRuleAt(scoped, at) ?? resolveRuleAt(global, at);
}

export function resolveBrokerRuleAt(rules: BrokerPayoutRule[], at: Date): BrokerPayoutRule | null {
  return resolveRuleAt(rules, at);
}

type AnyRule = {
  kind: "CPA_FIXED" | "CPA_CRG" | "REV_SHARE" | "HYBRID";
  cpaAmount: Prisma.Decimal | null;
  crgRate: Prisma.Decimal | null;
  revShareRate: Prisma.Decimal | null;
};

/**
 * Compute payout owed for a single conversion under a given rule.
 * Returns Prisma.Decimal for exact money math.
 */
export function applyRule(
  rule: AnyRule,
  kind: ConversionKind,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  const zero = new Prisma.Decimal(0);
  switch (rule.kind) {
    case "CPA_FIXED":
      return kind === "FTD" && rule.cpaAmount ? rule.cpaAmount : zero;
    case "CPA_CRG":
      // CPA amount on FTD; CRG top-up / shortfall handled separately by cohort settlement
      return kind === "FTD" && rule.cpaAmount ? rule.cpaAmount : zero;
    case "REV_SHARE":
      if ((kind === "FTD" || kind === "REDEPOSIT") && rule.revShareRate) {
        return amount.mul(rule.revShareRate);
      }
      return zero;
    case "HYBRID":
      if (kind === "FTD" && rule.cpaAmount) {
        const cpa = rule.cpaAmount;
        if (rule.revShareRate) return cpa.add(amount.mul(rule.revShareRate));
        return cpa;
      }
      if (kind === "REDEPOSIT" && rule.revShareRate) {
        return amount.mul(rule.revShareRate);
      }
      return zero;
    default:
      return zero;
  }
}
