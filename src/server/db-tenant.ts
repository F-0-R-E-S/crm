/**
 * Tenant isolation layer (v2.0 S2.0-1).
 *
 * `withTenant(tenantId, fn)` scopes a callback so that the Prisma middleware
 * auto-injects `{ tenantId }` into `where` on all tenant-scoped model reads +
 * mutations. Creates without an explicit tenantId receive a fallback id.
 *
 * When no tenantId is active, the middleware is a no-op. Cross-tenant code
 * paths (super-admin, cron workers) run outside `withTenant` on purpose.
 *
 * NOTE: uses `$use` middleware (not `$extends`) because `$extends` does NOT
 * preserve AsyncLocalStorage context for the slot read. `$use` honors it
 * correctly, which is essential for this design.
 */
import type { PrismaClient } from "@prisma/client";
// Re-export the pure-context helpers so existing callers continue to work.
export {
  DEFAULT_TENANT_ID,
  getActiveTenantId,
  withTenant,
} from "./tenant-context";
import { DEFAULT_TENANT_ID, getActiveTenantId } from "./tenant-context";

/**
 * Models that carry a `tenantId` column (v2.0 S2.0-1). Reads/updates/deletes
 * inside `withTenant(...)` are auto-filtered by tenant. Writes (`create`,
 * `createMany`) must provide tenantId explicitly.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  "Affiliate",
  "AffiliateIntakeWebhook",
  "AffiliatePayoutRule",
  "AlertLog",
  "AnalyticsPreset",
  "AnalyticsShareLink",
  "ApiKey",
  "AutologinAttempt",
  "Broker",
  "BrokerPayoutRule",
  "BrokerTemplate",
  "Flow",
  "FlowVersion",
  "IntakeSettings",
  "Lead",
  "ManualReviewQueue",
  "ProxyEndpoint",
  "RotationRule",
  "ScheduledChange",
  "TelegramSubscription",
  "User",
]);

const READ_OPS = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "findFirstOrThrow",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

const WRITE_FILTER_OPS = new Set(["update", "updateMany", "delete", "deleteMany"]);
const CREATE_OPS = new Set(["create", "createMany", "upsert"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Prisma $use action names (subset — others pass through).
const READ_ACTIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);
const WRITE_FILTER_ACTIONS = new Set(["update", "updateMany", "delete", "deleteMany"]);
const UNIQUE_ACTIONS = new Set(["findUnique", "findUniqueOrThrow"]);
const CREATE_ACTIONS = new Set(["create", "createMany", "upsert"]);

/**
 * Attach the tenant-isolation middleware to a PrismaClient. Returns the same
 * client for fluent composition.
 */
export function attachTenantMiddleware<T extends PrismaClient>(client: T): T {
  client.$use(async (params, next) => {
    const model = params.model;
    if (!model || !TENANT_SCOPED_MODELS.has(model)) return next(params);
    const tenantId = getActiveTenantId();
    const action = params.action;

    if (READ_ACTIONS.has(action) || WRITE_FILTER_ACTIONS.has(action)) {
      if (!tenantId) return next(params);
      const a = (params.args ?? {}) as Record<string, unknown>;
      const existingWhere = (a.where as Record<string, unknown>) ?? {};
      a.where = { ...existingWhere, tenantId };
      params.args = a;
      return next(params);
    }

    if (UNIQUE_ACTIONS.has(action)) {
      if (!tenantId) return next(params);
      // Prisma's findUnique validates that `where` only uses unique keys.
      // Inject at the post-read stage instead: query unfiltered, then null
      // the result if tenantId doesn't match. Cross-tenant reads see null.
      const res = await next(params);
      if (res && typeof res === "object" && "tenantId" in res) {
        const rowTenant = (res as { tenantId?: string | null }).tenantId;
        if (rowTenant && rowTenant !== tenantId) {
          if (action === "findUniqueOrThrow") {
            throw new Error("Record not found (tenant mismatch)");
          }
          return null;
        }
      }
      return res;
    }

    if (CREATE_ACTIONS.has(action)) {
      const fillId = tenantId ?? DEFAULT_TENANT_ID;
      const a = (params.args ?? {}) as Record<string, unknown>;
      if (action === "create") {
        const data = a.data;
        if (isRecord(data) && data.tenantId === undefined) {
          a.data = { ...data, tenantId: fillId };
        }
      } else if (action === "createMany") {
        const data = a.data;
        if (Array.isArray(data)) {
          a.data = data.map((row) =>
            isRecord(row) && row.tenantId === undefined ? { ...row, tenantId: fillId } : row,
          );
        } else if (isRecord(data) && data.tenantId === undefined) {
          a.data = { ...data, tenantId: fillId };
        }
      } else if (action === "upsert") {
        const createData = a.create;
        if (isRecord(createData) && createData.tenantId === undefined) {
          a.create = { ...createData, tenantId: fillId };
        }
        // Do NOT mutate upsert.where — Prisma requires a unique key. If caller
        // needs tenant-scoped upsert, they should include tenantId in the
        // compound unique key (or call find+create explicitly).
      }
      params.args = a;
      return next(params);
    }

    return next(params);
  });
  return client;
}

/**
 * Backward-compat alias — returns the same client after attaching middleware.
 * Signature preserved so existing callers (`src/server/db.ts`) keep working.
 */
export function extendPrismaWithTenant<T extends PrismaClient>(client: T): T {
  return attachTenantMiddleware(client);
}
