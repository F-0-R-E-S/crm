// Pure helpers for the FilterConditionEditor — field/op legality matrix,
// default values, and Zod-level validation surfacing. Kept separate from
// the React component so the matrix can be tested in a Node env without
// jsdom.

import {
  FilterConditionSchema,
  type FilterNodeSchema,
  NodeIdSchema as _NodeId,
} from "@/server/routing/flow/model";
import type { z } from "zod";

export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export type FilterLogic = z.infer<typeof FilterNodeSchema>["logic"];

export const FILTER_FIELDS = [
  "geo",
  "subId",
  "utm_source",
  "utm_medium",
  "affiliateId",
  "timeOfDay",
] as const;

export const FILTER_OPS = ["eq", "neq", "in", "not_in", "matches"] as const;

export type FilterField = (typeof FILTER_FIELDS)[number];
export type FilterOp = (typeof FILTER_OPS)[number];

/**
 * Return the list of ops that make semantic sense for a given field.
 * `matches` only applies to free-text string fields (regex); `timeOfDay`
 * only supports `eq` / `in` (we treat a time-of-day bucket as a literal
 * range encoded as a string "HH:MM-HH:MM"). This matrix is surfaced to
 * the UI to filter the op dropdown.
 */
export function legalOpsForField(field: FilterField): FilterOp[] {
  switch (field) {
    case "timeOfDay":
      // Time-of-day is a closed vocabulary — no regex matching makes
      // sense, and set operations are always "in one of these ranges".
      return ["eq", "in", "not_in"];
    case "affiliateId":
      // Opaque ID — set membership is common; regex doesn't make sense.
      return ["eq", "neq", "in", "not_in"];
    case "geo":
      // Country code — set membership most common, regex occasionally
      // used for carve-outs like "UA-\d+" subregion coding.
      return ["eq", "neq", "in", "not_in", "matches"];
    default:
      // Free-text fields: subId, utm_source, utm_medium → all ops legal.
      return ["eq", "neq", "in", "not_in", "matches"];
  }
}

/**
 * Returns the default value shape for a {field, op} pair. The value
 * type depends on the op — `in`/`not_in` want arrays, `eq`/`neq` want
 * scalars, `timeOfDay` eq wants a single range string.
 */
export function defaultValueFor(field: FilterField, op: FilterOp): string | string[] {
  if (op === "in" || op === "not_in") return [];
  if (field === "timeOfDay") return "00:00-24:00";
  return "";
}

/**
 * Coerce an existing value into something that's shape-valid for the
 * new op after the user toggles op dropdowns. Examples:
 *   "UA" → op "in"    → ["UA"]
 *   ["UA","PL"] → "eq" → "UA"
 *   "" → "in"         → []
 * This keeps the builder non-destructive: if the user flips `eq` →
 * `in` → back to `eq`, we don't lose the seed string.
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
 * Validate a single condition row via the canonical Zod schema. Returns
 * a shape the UI can directly surface (`{ok, error}`) without plumbing
 * a ZodError.
 */
export function validateCondition(c: FilterCondition): ConditionValidity {
  const r = FilterConditionSchema.safeParse(c);
  if (r.success) return { ok: true };
  const first = r.error.issues[0];
  return { ok: false, error: first?.message ?? "invalid" };
}

/**
 * Validate a full condition list for a Filter node. Surfaces an error
 * about empty lists (Zod requires `.min(1)`) or the first invalid row.
 * The publish guard re-runs the full FlowGraphSchema, so this is just
 * for inline UX.
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
 * string[] for `in` / `not_in` ops. Trims whitespace and drops empties;
 * preserves order and de-duplicates.
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
