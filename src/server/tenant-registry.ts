/**
 * v2.0 S2.0-2 — tenant registry.
 *
 * Server-side (Node) helper that resolves a tenant SLUG to a tenantId by
 * querying Prisma. Result is cached for 60s to keep hot-path requests fast.
 *
 * Edge-runtime callers must NOT import this module (it pulls Prisma). The
 * middleware stays Edge-safe by writing the slug (via `resolveDomain`) into
 * a `x-tenant-slug` request header; the downstream Node handler consumes
 * that header and resolves to an id via `tenantIdFromSlug`.
 */
import { prisma } from "@/server/db";
import { DEFAULT_TENANT_ID } from "@/server/tenant-context";

interface CacheEntry {
  tenantId: string | null;
  expiresAt: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * Resolve a tenant slug (or raw hostname match against `Tenant.domains[]`) to
 * a tenantId. Returns `DEFAULT_TENANT_ID` when slug is `"default"` or empty.
 * Returns `null` on genuine "tenant not found" so callers can 404.
 */
export async function tenantIdFromSlug(slug: string | null | undefined): Promise<string | null> {
  const key = (slug ?? "").trim().toLowerCase();
  if (!key || key === "default") return DEFAULT_TENANT_ID;

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.tenantId;

  const row = await prisma.tenant.findFirst({
    where: { slug: key, isActive: true },
    select: { id: true },
  });
  const tenantId = row?.id ?? null;
  cache.set(key, { tenantId, expiresAt: now + TTL_MS });
  return tenantId;
}

/**
 * Resolve using explicit `Tenant.domains[]` entry (for vanity / custom
 * domains). Returns the tenantId or `null` if no tenant claims the host.
 */
export async function tenantIdFromDomain(
  hostname: string | null | undefined,
): Promise<string | null> {
  const host = (hostname ?? "").trim().toLowerCase();
  if (!host) return null;
  const cacheKey = `domain:${host}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.tenantId;

  const row = await prisma.tenant.findFirst({
    where: { domains: { has: host }, isActive: true },
    select: { id: true },
  });
  const tenantId = row?.id ?? null;
  cache.set(cacheKey, { tenantId, expiresAt: now + TTL_MS });
  return tenantId;
}

/**
 * Test / super-admin hook — flush the cache. Called after tenant CRUD
 * so writes take effect without waiting 60s.
 */
export function clearTenantCache(): void {
  cache.clear();
}

export function _cacheSize(): number {
  return cache.size;
}
