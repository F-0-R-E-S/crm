import { prisma } from "@/server/db";

export const UNMAPPED = "unmapped" as const;
export type CanonicalCode = string | typeof UNMAPPED;

interface CacheEntry {
  raw: Map<string, string>; // rawStatus → canonicalCode
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

export function invalidateStatusMappingCache(brokerId?: string): void {
  if (brokerId) cache.delete(brokerId);
  else cache.clear();
}

async function loadMappingForBroker(brokerId: string): Promise<Map<string, string>> {
  const now = Date.now();
  const hit = cache.get(brokerId);
  if (hit && hit.expiresAt > now) return hit.raw;
  const rows = await prisma.statusMapping.findMany({
    where: { brokerId },
    include: { canonicalStatus: { select: { code: true } } },
  });
  const raw = new Map<string, string>();
  for (const r of rows) {
    if (r.canonicalStatus?.code) raw.set(r.rawStatus, r.canonicalStatus.code);
  }
  cache.set(brokerId, { raw, expiresAt: now + CACHE_TTL_MS });
  return raw;
}

/**
 * Classify a broker-reported raw status into the canonical code.
 * Returns `"unmapped"` when:
 *  - rawStatus is null/empty after trimming
 *  - broker has no StatusMapping rows
 *  - rawStatus has no mapping row on this broker
 *
 * Case-sensitive on the raw status (brokers report wildly different casings
 * and we want the admin to explicitly map each variant they see). Whitespace
 * is trimmed before lookup.
 */
export async function classifyLeadStatus(
  brokerId: string,
  rawStatus: string | null | undefined,
): Promise<CanonicalCode> {
  if (rawStatus == null) return UNMAPPED;
  const trimmed = String(rawStatus).trim();
  if (trimmed === "") return UNMAPPED;
  const mapping = await loadMappingForBroker(brokerId);
  return mapping.get(trimmed) ?? UNMAPPED;
}
