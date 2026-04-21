/**
 * Tiny Levenshtein-distance similarity helper. No deps.
 * Used by statusMapping.suggestFor — maps each unmapped raw status to its
 * closest canonical (code or label) by edit distance, normalized to 0..1.
 */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - dist / maxLen;
}

export interface CanonicalOption {
  id: string;
  code: string;
  label: string;
}

export interface Suggestion {
  rawStatus: string;
  canonicalStatusId: string;
  canonicalCode: string;
  score: number; // 0..1
}

/**
 * For each raw status, find the best-matching canonical by comparing against
 * code + label. Returns `{ canonicalStatusId, canonicalCode, score }`.
 * Scores below `minScore` omit the suggestion.
 */
export function suggestMappings(
  rawStatuses: readonly string[],
  canonicals: readonly CanonicalOption[],
  minScore = 0.35,
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const raw of rawStatuses) {
    if (!raw) continue;
    let best: Suggestion | null = null;
    for (const c of canonicals) {
      const s = Math.max(similarity(raw, c.code), similarity(raw, c.label));
      if (s < minScore) continue;
      if (!best || s > best.score) {
        best = {
          rawStatus: raw,
          canonicalStatusId: c.id,
          canonicalCode: c.code,
          score: s,
        };
      }
    }
    if (best) out.push(best);
  }
  return out;
}
