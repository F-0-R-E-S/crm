/**
 * v2.0 S2.0-2 — per-tenant branding pipeline.
 *
 * `TenantThemeSchema` is the Zod shape for `Tenant.theme`. Invalid / partial
 * themes are stripped — a missing field returns `undefined` at the call-site
 * which the shell components handle by falling back to the default tokens.
 *
 * Keep the surface area narrow — only brand-level fields (name, logo, two
 * colors, legal links). Spacing/density/font are intentionally NOT themable
 * (those break the design system).
 */
import { prisma } from "@/server/db";
import { z } from "zod";

// oklch / hex / named — stored as a raw CSS color string.
const ColorString = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9#(),.%\s\-/]+$/, "invalid CSS color");

export const TenantThemeSchema = z
  .object({
    brandName: z.string().max(80).optional(),
    logoUrl: z.string().url().max(500).optional(),
    primaryColor: ColorString.optional(),
    accentColor: ColorString.optional(),
    legalLinks: z
      .object({
        privacy: z.string().url().max(500).optional(),
        terms: z.string().url().max(500).optional(),
        imprint: z.string().url().max(500).optional(),
      })
      .partial()
      .optional(),
  })
  .strict();

export type TenantTheme = z.infer<typeof TenantThemeSchema>;

/**
 * Parse a raw `Tenant.theme` JSON blob. Returns an empty object on any
 * validation failure (never throws) — branding is best-effort and must
 * never break a page render.
 */
export function parseTenantTheme(raw: unknown): TenantTheme {
  if (raw === null || raw === undefined) return {};
  const parsed = TenantThemeSchema.safeParse(raw);
  if (!parsed.success) return {};
  return parsed.data;
}

interface CacheEntry {
  theme: TenantTheme;
  displayName: string;
  expiresAt: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export interface TenantBranding {
  tenantId: string;
  displayName: string;
  theme: TenantTheme;
}

/**
 * Load branding for a tenant. 60s LRU cache. Call in RSC / API routes.
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  const now = Date.now();
  const hit = cache.get(tenantId);
  if (hit && hit.expiresAt > now) {
    return { tenantId, displayName: hit.displayName, theme: hit.theme };
  }
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { displayName: true, theme: true },
  });
  const displayName = row?.displayName ?? "GambChamp";
  const theme = parseTenantTheme(row?.theme);
  cache.set(tenantId, { theme, displayName, expiresAt: now + TTL_MS });
  return { tenantId, displayName, theme };
}

export function clearBrandingCache(): void {
  cache.clear();
}

/**
 * Convert a TenantTheme into a map of CSS variables for inline `<style>`
 * injection. Only the keys present in the theme are emitted.
 */
export function themeToCssVars(theme: TenantTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  if (theme.primaryColor) {
    vars["--brand"] = theme.primaryColor;
    vars["--fg-0"] = theme.primaryColor;
  }
  if (theme.accentColor) {
    vars["--accent"] = theme.accentColor;
  }
  return vars;
}
