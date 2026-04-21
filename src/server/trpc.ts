import { auth } from "@/auth";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "./db";
import { DEFAULT_TENANT_ID, withTenant } from "./db-tenant";

export async function createTRPCContext() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? DEFAULT_TENANT_ID;
  return { session, prisma, tenantId };
}

const t = initTRPC.context<typeof createTRPCContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * All authenticated procedures run inside `withTenant(ctx.tenantId, …)` so
 * every Prisma call auto-filters by tenant. See `src/server/db-tenant.ts`.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const nextCtx = {
    ...ctx,
    userId: ctx.session.user.id,
    role: ctx.session.user.role,
    tenantId: ctx.session.user.tenantId,
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
