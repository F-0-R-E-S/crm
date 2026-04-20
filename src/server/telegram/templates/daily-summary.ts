export function render(p: Record<string, unknown>): string {
  const date = String(p.date ?? "?");
  const intake = String(p.total ?? p.intake ?? "?");
  const pushed = String(p.pushed ?? "?");
  const accepted = String(p.accepted ?? "?");
  const declined = String(p.declined ?? "?");
  const ftd = String(p.ftd ?? "?");
  const rejected = String(p.rejected ?? "?");
  const top = Array.isArray(p.topAffiliates)
    ? (p.topAffiliates as Array<{ name?: unknown; count?: unknown }>)
        .slice(0, 3)
        .map((a) => `${String(a.name ?? "?")}: ${String(a.count ?? 0)}`)
        .join(", ")
    : "—";
  return `*Daily summary* ${date}\nIntake: ${intake} | Pushed: ${pushed} | Accepted: ${accepted}\nDeclined: ${declined} | FTD: ${ftd} | Rejected: ${rejected}\nTop affiliates: ${top}`;
}
