export function render(p: Record<string, unknown>): string {
  const entityType = String(p.entityType ?? "?");
  const entityId = String(p.entityId ?? "?");
  const id = String(p.id ?? "?");
  const latency =
    typeof p.latencyMs === "number" ? `${Math.round((p.latencyMs as number) / 1000)}s` : "?";
  const patch = p.patch && typeof p.patch === "object" ? p.patch : {};
  const fields = Object.keys(patch as Record<string, unknown>).join(", ") || "—";
  return `*Scheduled change applied* ${entityType} ${entityId.slice(0, 10)}\nID: ${id.slice(0, 10)}\nFields: ${fields}\nLatency from target: ${latency}`;
}
