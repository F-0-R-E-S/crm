import { auth } from "@/auth";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "./db";
import { DEFAULT_TENANT_ID, withTenant } from "./db-tenant";
import { tenantIdFromSlug } from "./tenant-registry";

interface CreateContextOptions {
  req?: Request;
}

export async function createTRPCContext(opts: CreateContextOptions = {}) {
  const session = await auth();

  // v2.0 S2.0-2 — the middleware writes `x-tenant-slug` based on the request
  // hostname. Resolve it to a tenantId; an unknown slug yields `null`,
  // which we refuse to bind to a tenant (prevents leaks).
  let hostTenantId: string | null = DEFAULT_TENANT_ID;
  const slug = opts.req?.headers.get("x-tenant-slug") ?? null;
  if (slug && slug !== "default") {
    hostTenantId = await tenantIdFromSlug(slug);
  }

  const sessionTenantId = session?.user?.tenantId ?? null;

  // Pick the tenantId:
  //   1. If the session is bound to a tenant — use it (session wins for user-
  //      scoped ops). The protectedProcedure asserts it matches hostTenantId.
  //   2. Else, fall back to hostTenantId (for unauthenticated callers like
  //      /api/trpc/user.me before login).
  const tenantId = sessionTenantId ?? hostTenantId ?? DEFAULT_TENANT_ID;

  return { session, prisma, tenantId, hostTenantId, sessionTenantId };
}

const t = initTRPC.context<typeof createTRPCContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * All authenticated procedures run inside `withTenant(ctx.tenantId, …)` so
 * every Prisma call auto-filters by tenant. See `src/server/db-tenant.ts`.
 *
 * v2.0 S2.0-2 — enforces that the session's tenantId matches the hostname's
 * tenantId. A user of tenant A hitting the dashboard served on tenant B's
 * hostname is forced out (UNAUTHORIZED → client redirects to the correct
 * host / forces re-login).
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });

  const sessionTenantId = ctx.session.user.tenantId;
  const hostTenantId = ctx.hostTenantId;

  // Super-admins may operate cross-host (e.g., impersonation of tenant A
  // from the default network) — they skip this check.
  if (hostTenantId && sessionTenantId !== hostTenantId && ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "tenant_host_mismatch",
    });
  }

  const nextCtx = {
    ...ctx,
    userId: ctx.session.user.id,
    role: ctx.session.user.role,
    tenantId: sessionTenantId,
  };
  return withTenant(nextCtx.tenantId, () => next({ ctx: nextCtx }));
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});

/**
 * Cross-tenant ops (tenant CRUD, global maintenance). Runs OUTSIDE any
 * `withTenant` scope — Prisma queries go unscoped. Super-admin only.
 */
export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.session.user.id,
      role: ctx.session.user.role,
      tenantId: ctx.session.user.tenantId,
    },
  });
});
