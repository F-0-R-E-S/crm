// PQL field registry. The evaluator and the PQL editor both walk this
// list; adding a new field means: (1) extend `PqlFieldSchema` in
// `../flow/model.ts`, (2) append an entry here with its legal signs and
// `extract` fn, (3) write a test pair for each legal sign.
//
// Naming mirrors iREV for operator familiarity (`Hour of Day`, `Phone
// Number`, `Traffic Provider`). The set is intentionally a superset of
// our v1.0 FilterCondition vocabulary — never a subset.

import type { LeadSnapshot } from "../engine";
import type { PqlField, PqlSign } from "../flow/model";

export type PqlValueType = "string" | "number" | "stringArray" | "timeRange";

export interface PqlFieldDef {
  key: PqlField;
  label: string;
  valueType: PqlValueType;
  legalSigns: PqlSign[];
  extract(lead: LeadSnapshot, now?: Date): unknown;
}

// Every sign legal for free-text string fields. Used as a shared reference
// so we don't duplicate the same long list six times.
const STRING_SIGNS: PqlSign[] = [
  "eq",
  "neq",
  "in",
  "not_in",
  "contains",
  "starts_with",
  "ends_with",
  "matches",
];

// Signs that make semantic sense on numeric/ordinal values.
const NUMERIC_SIGNS: PqlSign[] = ["eq", "neq", "in", "not_in", "gte", "lte"];

export const PQL_FIELDS: PqlFieldDef[] = [
  {
    key: "geo",
    label: "GEO",
    valueType: "string",
    legalSigns: ["eq", "neq", "in", "not_in", "matches"],
    extract: (l) => l.geo,
  },
  {
    key: "subId",
    label: "Sub ID",
    valueType: "string",
    legalSigns: STRING_SIGNS,
    extract: (l) => l.subId,
  },
  {
    key: "utm_source",
    label: "UTM Source",
    valueType: "string",
    legalSigns: STRING_SIGNS,
    extract: (l) => (l.utm as Record<string, unknown> | undefined)?.source,
  },
  {
    key: "utm_medium",
    label: "UTM Medium",
    valueType: "string",
    legalSigns: STRING_SIGNS,
    extract: (l) => (l.utm as Record<string, unknown> | undefined)?.medium,
  },
  {
    key: "affiliateId",
    label: "Affiliate ID",
    valueType: "string",
    legalSigns: ["eq", "neq", "in", "not_in"],
    extract: (l) => l.affiliateId,
  },
  {
    key: "timeOfDay",
    label: "Time of Day (range)",
    valueType: "timeRange",
    legalSigns: ["eq", "in", "not_in"],
    extract: (_l, now) => {
      const d = now ?? new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    },
  },
  {
    key: "phone",
    label: "Phone Number",
    valueType: "string",
    legalSigns: ["eq", "neq", "contains", "starts_with", "ends_with", "matches"],
    extract: (l) =>
      (l as unknown as { phone?: unknown }).phone ??
      (l as unknown as { phoneE164?: unknown }).phoneE164,
  },
  {
    key: "hourOfDay",
    label: "Hour of Day (0–23)",
    valueType: "number",
    legalSigns: NUMERIC_SIGNS,
    extract: (_l, now) => (now ?? new Date()).getUTCHours(),
  },
];

const BY_KEY: Record<PqlField, PqlFieldDef> = Object.fromEntries(
  PQL_FIELDS.map((f) => [f.key, f]),
) as Record<PqlField, PqlFieldDef>;

/** Return the registry entry for a field. Throws if unknown (should be
 *  impossible post-Zod-validation, but defensive for hand-crafted input). */
export function fieldDef(key: PqlField): PqlFieldDef {
  const def = BY_KEY[key];
  if (!def) throw new Error(`unknown PQL field: ${key}`);
  return def;
}

/** Whether `sign` is allowed on `field` per the registry. Used by the
 *  editor to filter the sign dropdown and by the schema/evaluator as a
 *  defensive runtime gate. */
export function isLegalSign(field: PqlField, sign: PqlSign): boolean {
  return fieldDef(field).legalSigns.includes(sign);
}
