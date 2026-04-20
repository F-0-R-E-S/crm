export function render(p: Record<string, unknown>): string {
  const date = String(p.date ?? "?");
  const affiliate = String(p.affiliateName ?? p.affiliateId ?? "?");
  const intake = String(p.intake ?? p.count ?? "?");
  const pushed = String(p.pushed ?? "?");
  const ftd = String(p.ftd ?? "?");
  return `*Your daily summary* ${date}\nAffiliate: ${affiliate}\nIntake: ${intake} | Pushed: ${pushed} | FTD: ${ftd}`;
}
