export function render(p: Record<string, unknown>): string {
  const entityType = String(p.entityType ?? "?");
  const entityId = String(p.entityId ?? "?");
  const id = String(p.id ?? "?");
  const err = String(p.errorMessage ?? "unknown");
  return `*Scheduled change FAILED* ${entityType} ${entityId.slice(0, 10)}\nID: ${id.slice(0, 10)}\nError: ${err}`;
}
