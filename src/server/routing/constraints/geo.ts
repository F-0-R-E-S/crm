export interface GeoRule {
  allowed?: string[];
  blocked?: string[];
}
export type GeoResult = { ok: true } | { ok: false; reason: "blocked_geo" | "not_in_allowed" };

export function evaluateGeo(geo: string, rule: GeoRule): GeoResult {
  const g = geo.toUpperCase();
  const blocked = (rule.blocked ?? []).map((x) => x.toUpperCase());
  if (blocked.includes(g)) return { ok: false, reason: "blocked_geo" };
  const allowed = (rule.allowed ?? []).map((x) => x.toUpperCase());
  if (allowed.length === 0) return { ok: true };
  return allowed.includes(g) ? { ok: true } : { ok: false, reason: "not_in_allowed" };
}
