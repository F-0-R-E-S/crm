// Pure PQL rule evaluator. Walks a list of PqlRule with AND/OR logic;
// returns {ok, failedRuleIndex?} so callers can trace which rule killed
// the gate. Shortcircuits AND on first miss and OR on first hit.
//
// Case-sensitivity is per-rule: when `caseSensitive === false` we
// lowercase both sides before comparison for text operators
// (eq / neq / contains / starts_with / ends_with / matches). Array ops
// (in / not_in) apply the same transform to each element. Numeric ops
// (gte / lte) never touch the case-flag.

import type { LeadSnapshot } from "../engine";
import type { PqlField, PqlRule, PqlSign } from "../flow/model";
import { fieldDef } from "./fields";

export interface PqlEvalResult {
  ok: boolean;
  failedRuleIndex?: number;
  failedField?: PqlField;
  failedSign?: PqlSign;
}

function norm(v: unknown, caseSensitive: boolean): string {
  const s = typeof v === "string" ? v : String(v ?? "");
  return caseSensitive ? s : s.toLowerCase();
}

function normArray(v: unknown, caseSensitive: boolean): string[] {
  const arr = Array.isArray(v) ? v : [v];
  return arr.map((x) => norm(x, caseSensitive));
}

function evaluateRule(rule: PqlRule, lead: LeadSnapshot, now?: Date): boolean {
  const def = fieldDef(rule.field);
  const rawLeft = def.extract(lead, now);
  const cs = rule.caseSensitive;
  const sign: PqlSign = rule.sign;

  // Numeric ops: coerce to number on both sides; miss → false.
  if (sign === "gte" || sign === "lte") {
    const l = typeof rawLeft === "number" ? rawLeft : Number.parseFloat(String(rawLeft ?? ""));
    const r =
      typeof rule.value === "number"
        ? rule.value
        : Number.parseFloat(String(Array.isArray(rule.value) ? rule.value[0] : rule.value));
    if (Number.isNaN(l) || Number.isNaN(r)) return false;
    return sign === "gte" ? l >= r : l <= r;
  }

  const left = norm(rawLeft, cs);

  switch (sign) {
    case "eq":
      return left === norm(rule.value, cs);
    case "neq":
      return left !== norm(rule.value, cs);
    case "in":
      return normArray(rule.value, cs).includes(left);
    case "not_in":
      return !normArray(rule.value, cs).includes(left);
    case "contains":
      return left.includes(norm(rule.value, cs));
    case "starts_with":
      return left.startsWith(norm(rule.value, cs));
    case "ends_with":
      return left.endsWith(norm(rule.value, cs));
    case "matches": {
      const pattern = String(Array.isArray(rule.value) ? rule.value[0] : rule.value);
      if (pattern.length === 0) return false;
      try {
        return new RegExp(pattern, cs ? "" : "i").test(left);
      } catch {
        return false;
      }
    }
    default: {
      const _exhaustive: never = sign;
      return _exhaustive;
    }
  }
}

/** Evaluate a PQL gate (rules + AND/OR logic). Returns `{ok:true}` when
 *  the gate passes; on failure returns the index and identifiers of the
 *  rule that killed it (only meaningful for AND — for OR, every rule was
 *  tried, so we report the last rule's index). */
export function evaluatePqlGate(
  rules: PqlRule[],
  logic: "AND" | "OR",
  lead: LeadSnapshot,
  now?: Date,
): PqlEvalResult {
  if (rules.length === 0) return { ok: true };
  if (logic === "AND") {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule) continue;
      if (!evaluateRule(rule, lead, now)) {
        return {
          ok: false,
          failedRuleIndex: i,
          failedField: rule.field,
          failedSign: rule.sign,
        };
      }
    }
    return { ok: true };
  }
  // OR: first match wins.
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule) continue;
    if (evaluateRule(rule, lead, now)) return { ok: true };
  }
  const last = rules[rules.length - 1];
  return {
    ok: false,
    failedRuleIndex: rules.length - 1,
    failedField: last?.field,
    failedSign: last?.sign,
  };
}
