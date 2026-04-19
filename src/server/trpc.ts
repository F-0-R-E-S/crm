import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export const createTRPCContext = async () => {
  const session = await auth();
  return { session, prisma };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const userId = (ctx.session?.user as { id?: string } | undefined)?.id;
  if (!ctx.session || !userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId,
    },
  });
});
