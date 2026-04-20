const SECRET_KEYS = /secret|token|password|key/i;

function redact(diff: unknown): string {
  if (!diff || typeof diff !== "object") return "—";
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(diff as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.test(k) ? "***" : v;
  }
  return JSON.stringify(out).slice(0, 500);
}

export function render(p: Record<string, unknown>): string {
  const actor = String(p.actor ?? p.userId ?? "?");
  const diff = redact(p.diff);
  return `*Fraud policy changed*\nActor: ${actor}\nDiff: \`${diff}\``;
}
