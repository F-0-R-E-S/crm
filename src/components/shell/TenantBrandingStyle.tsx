/**
 * v2.0 S2.0-2 — RSC-only. Injects per-tenant CSS vars into the shell.
 *
 * Renders a <style> tag with `--brand` / `--accent` overrides when the active
 * tenant has a theme. Safe no-op for default/empty themes.
 */
import { getTenantBranding, themeToCssVars } from "@/server/tenant/branding";

export async function TenantBrandingStyle({ tenantId }: { tenantId: string }) {
  const { theme } = await getTenantBranding(tenantId);
  const vars = themeToCssVars(theme);
  const entries = Object.entries(vars);
  if (entries.length === 0) return null;
  const body = `:root{${entries.map(([k, v]) => `${k}:${v}`).join(";")}}`;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, sanitized via strict Zod color regex
  return <style dangerouslySetInnerHTML={{ __html: body }} />;
}
