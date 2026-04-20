export function render(p: Record<string, unknown>): string {
  const scope = String(p.scope ?? "?");
  const scopeName = String(p.scopeName ?? p.scopeId ?? "?");
  const window = String(p.window ?? "?");
  const limit = String(p.limit ?? "?");
  return `*Cap reached* ${scope} ${scopeName}\nWindow: ${window}\nLimit: ${limit}`;
}
