import { auth } from "@/auth";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "./db";

export async function createTRPCContext() {
  const session = await auth();
  return { session, prisma };
}

const t = initTRPC.context<typeof createTRPCContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.session.user.id, role: ctx.session.user.role } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});
