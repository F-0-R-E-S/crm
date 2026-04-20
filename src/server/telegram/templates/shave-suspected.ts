export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const expected = String(p.expected ?? "?");
  const actual = String(p.actual ?? "?");
  return `*Shave suspected* \`${leadId}\`\nExpected: ${expected}\nActual: ${actual}`;
}
