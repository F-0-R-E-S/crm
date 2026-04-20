export function render(p: Record<string, unknown>): string {
  const ruleKey = String(p.rule_key ?? "?");
  const severity = String(p.severity ?? "?");
  const message = String(p.message ?? "?");
  const alertId = p.alert_id ? ` (${p.alert_id})` : "";
  const badge = severity === "critical" ? "🚨 CRITICAL" : "⚠️ WARNING";
  return `${badge} *${ruleKey}*${alertId}\n${message}`;
}
