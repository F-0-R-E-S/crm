export interface DocsStalenessReportPayload {
  windowDays: number;
  topRefusedQuestions: Array<{ q: string; count: number }>;
}

export function renderDocsStalenessReport(p: DocsStalenessReportPayload): string {
  const lines = [
    `📚 *Docs staleness digest* — last ${p.windowDays} days`,
    "",
    `Top ${p.topRefusedQuestions.length} refused questions (AI answered "I don't have enough context"):`,
    "",
  ];
  p.topRefusedQuestions.forEach((r, i) => {
    lines.push(`${i + 1}. (×${r.count}) ${r.q}`);
  });
  lines.push("", "Consider adding these topics to the human-layer docs.");
  return lines.join("\n");
}

export function render(p: Record<string, unknown>): string {
  const windowDays = Number(p.windowDays ?? 7);
  const topRefusedQuestions = Array.isArray(p.topRefusedQuestions)
    ? (p.topRefusedQuestions as Array<{ q: string; count: number }>)
    : [];
  return renderDocsStalenessReport({ windowDays, topRefusedQuestions });
}
