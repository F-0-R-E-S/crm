// Pure helpers for the FilterConditionEditor — field/op legality matrix,
// default values, and Zod-level validation surfacing. Kept separate from
// the React component so the matrix can be tested in a Node env without
// jsdom.
//
// S3.2 T1: extended to expose the full PQL vocabulary (8 fields × 10
// signs) with per-rule `caseSensitive` toggle. Internally the helpers
// still use `op` as the key name to keep the React component stable;
// the Inspector.tsx adapter translates `op ↔ sign` at the PqlRule
// boundary (see FilterConditionEditor onChange).

import {
  type FilterConditionSchema,
  type FilterNodeSchema,
  NodeIdSchema as _NodeId,
} from "@/server/routing/flow/model";
import type { z } from "zod";

// Keep the legacy FilterCondition Zod type — the editor operates on
// this shape. `caseSensitive` is a UI-only extension threaded via the
// condition row object so we don't have to change the schema.
export type FilterCondition = z.infer<typeof FilterConditionSchema> & {
  caseSensitive?: boolean;
};
export type FilterLogic = z.infer<typeof FilterNodeSchema>["logic"];

export const FILTER_FIELDS = [
  "geo",
  "subId",
  "utm_source",
  "utm_medium",
  "affiliateId",
  "timeOfDay",
  "phone",
  "hourOfDay",
] as const;

export const FILTER_OPS = [
  "eq",
  "neq",
  "in",
  "not_in",
  "contains",
  "starts_with",
  "ends_with",
  "gte",
  "lte",
  "matches",
] as const;

export type FilterField = (typeof FILTER_FIELDS)[number];
export type FilterOp = (typeof FILTER_OPS)[number];

/**
 * Return the list of ops that make semantic sense for a given field.
 * Mirrors the PQL registry in `src/server/routing/pql/fields.ts`.
 */
export function legalOpsForField(field: FilterField): FilterOp[] {
  switch (field) {
    case "timeOfDay":
      // Time-of-day is a closed vocabulary — no regex matching makes
      // sense; set ops are always "in one of these ranges".
      return ["eq", "in", "not_in"];
    case "affiliateId":
      // Opaque ID — set membership is common; regex doesn't make sense.
      return ["eq", "neq", "in", "not_in"];
    case "geo":
      // Country code — set membership most common, regex occasionally
      // used for carve-outs like "UA-\d+" subregion coding.
      return ["eq", "neq", "in", "not_in", "matches"];
    case "hourOfDay":
      // Numeric ordinal — comparison ops take precedence.
      return ["eq", "neq", "in", "not_in", "gte", "lte"];
    case "phone":
      // Free-form but ordinal-friendly for matching +380 / +44 ranges.
      return ["eq", "neq", "contains", "starts_with", "ends_with", "matches"];
    default:
      // Free-text fields: subId, utm_source, utm_medium → all string ops.
      return ["eq", "neq", "in", "not_in", "contains", "starts_with", "ends_with", "matches"];
  }
}

/**
 * Returns the default value shape for a {field, op} pair. The value
 * type depends on the op — `in`/`not_in` want arrays, `eq`/`neq` want
 * scalars, `timeOfDay` eq wants a single range string, numeric ops on
 * numeric fields want a scalar number as a string.
 */
export function defaultValueFor(field: FilterField, op: FilterOp): string | string[] {
  if (op === "in" || op === "not_in") return [];
  if (field === "timeOfDay") return "00:00-24:00";
  if (field === "hourOfDay" && (op === "gte" || op === "lte")) return "0";
  return "";
}

/**
 * Coerce an existing value into something that's shape-valid for the
 * new op after the user toggles op dropdowns.
 */
export function coerceValue(
  current: FilterCondition["value"],
  _prevOp: FilterOp,
  nextOp: FilterOp,
  field: FilterField,
): FilterCondition["value"] {
  const wantsArray = nextOp === "in" || nextOp === "not_in";
  if (wantsArray) {
    if (Array.isArray(current)) return current;
    if (typeof current === "string" && current.length > 0) return [current];
    if (typeof current === "number") return [String(current)];
    return [];
  }
  // Scalar target
  if (Array.isArray(current)) return current[0] ?? (field === "timeOfDay" ? "00:00-24:00" : "");
  if (typeof current === "number") return String(current);
  if (typeof current === "string" && current.length === 0 && field === "timeOfDay") {
    return "00:00-24:00";
  }
  return current;
}

export interface ConditionValidity {
  ok: boolean;
  error?: string;
}

/**
 * Validate a single condition row. Accepts either the legacy
 * FilterCondition field/op set OR the extended one — for the extended
 * set we do a shape check (non-empty field, op, value) rather than
 * routing through the narrow Zod schema.
 */
export function validateCondition(c: FilterCondition): ConditionValidity {
  if (!FILTER_FIELDS.includes(c.field as FilterField)) return { ok: false, error: "invalid field" };
  if (!FILTER_OPS.includes(c.op as FilterOp)) return { ok: false, error: "invalid op" };
  if (!legalOpsForField(c.field as FilterField).includes(c.op as FilterOp)) {
    return { ok: false, error: `op ${c.op} not legal for field ${c.field}` };
  }
  if (c.op === "in" || c.op === "not_in") {
    if (!Array.isArray(c.value)) return { ok: false, error: "value must be an array" };
  } else {
    if (Array.isArray(c.value) || c.value == null) {
      return { ok: false, error: "value must be a scalar" };
    }
    if (typeof c.value === "string" && c.value.length === 0) {
      return { ok: false, error: "value must not be empty" };
    }
  }
  return { ok: true };
}

/**
 * Validate a full condition list for a Filter node.
 */
export function validateConditions(
  rows: FilterCondition[],
): { ok: true } | { ok: false; error: string; index?: number } {
  if (rows.length === 0) return { ok: false, error: "at least one condition is required" };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const r = validateCondition(row);
    if (!r.ok) return { ok: false, error: r.error ?? "invalid", index: i };
  }
  return { ok: true };
}

/**
 * Parse a comma- or newline-separated chip input into the canonical
 * string[] for `in` / `not_in` ops.
 */
export function parseChips(raw: string): string[] {
  const parts = raw
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}
