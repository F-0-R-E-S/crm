export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const score = String(p.fraudScore ?? "?");
  const signals = Array.isArray(p.signals) ? p.signals : [];
  const top = signals
    .slice(0, 3)
    .map((s) => (typeof s === "object" && s && "kind" in s ? String((s as { kind: unknown }).kind) : String(s)))
    .join(", ");
  return `*Fraud hit* \`${leadId}\`\nScore: ${score}\nTop signals: ${top || "—"}`;
}
