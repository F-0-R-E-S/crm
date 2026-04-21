/**
 * Tenant-scoped async context (v2.0 S2.0-1).
 *
 * Uses AsyncLocalStorage to carry a tenantId across async boundaries.
 * This module has ZERO Prisma imports so it stays edge-safe-adjacent.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export const DEFAULT_TENANT_ID = "tenant_default";

type TenantSlot = { tenantId: string };
const storage = new AsyncLocalStorage<TenantSlot>();

export function withTenant<T>(tenantId: string, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run({ tenantId }, fn) as Promise<T> | T;
}

export function getActiveTenantId(): string | null {
  return storage.getStore()?.tenantId ?? null;
}
