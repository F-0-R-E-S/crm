export type TransformKind = "concat" | "format_phone" | "default" | "uppercase" | "lowercase";

export interface MappingRule {
  target: string;
  transform?: TransformKind;
  concatWith?: string;
  sep?: string;
  defaultValue?: string | number | boolean;
  format?: string;
}

export type MappingConfig = Record<string, MappingRule>;

export function applyMappingWithTransforms(
  lead: Record<string, unknown>,
  mapping: MappingConfig,
  staticPayload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [srcField, rule] of Object.entries(mapping)) {
    const rawValue = lead[srcField];
    let value: unknown = rawValue;

    switch (rule.transform) {
      case "concat": {
        const secondary = rule.concatWith ? lead[rule.concatWith] : undefined;
        const sep = rule.sep ?? " ";
        const parts = [rawValue, secondary].filter(
          (v) => v != null && String(v).length > 0,
        );
        value = parts.join(sep);
        break;
      }
      case "format_phone": {
        if (typeof rawValue === "string") {
          value = rawValue.replace(/[^\d]/g, "");
        }
        break;
      }
      case "default": {
        if (rawValue == null || rawValue === "") value = rule.defaultValue ?? null;
        break;
      }
      case "uppercase": {
        if (typeof rawValue === "string") value = rawValue.toUpperCase();
        break;
      }
      case "lowercase": {
        if (typeof rawValue === "string") value = rawValue.toLowerCase();
        break;
      }
      default:
        break;
    }

    if (value !== undefined && value !== null) out[rule.target] = value;
  }
  for (const [k, v] of Object.entries(staticPayload)) {
    out[k] = v;
  }
  return out;
}

export interface ValidateResult {
  ok: boolean;
  missing: string[];
}

export function validateMapping(
  mapping: MappingConfig,
  requiredTargets: string[],
): ValidateResult {
  const covered = new Set(Object.values(mapping).map((r) => r.target));
  const missing = requiredTargets.filter((t) => !covered.has(t));
  return { ok: missing.length === 0, missing };
}

const PII_RULES: Array<{ re: RegExp; mask: (v: string) => string }> = [
  { re: /^email$|_email$/i, mask: (v) => v.replace(/^(.).*(@.*)$/, "$1***$2") },
  {
    re: /^phone$|^tel$|_phone$/i,
    mask: (v) => (v.length > 9 ? `${v.slice(0, 6)}****${v.slice(-3)}` : "***"),
  },
  {
    re: /^last_?name$|_last_name$/i,
    mask: (v) => (v.length > 1 ? `${v[0]}***` : "***"),
  },
  { re: /^ip$|_ip$/i, mask: (v) => v.replace(/\.\d+$/, ".***") },
];

export function maskPII(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "string") {
      const rule = PII_RULES.find((r) => r.re.test(k));
      out[k] = rule ? rule.mask(v) : v;
    } else {
      out[k] = v;
    }
  }
  return out;
}
