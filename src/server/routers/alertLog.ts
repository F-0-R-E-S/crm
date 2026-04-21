import { adminProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { buildAlertLogWhere } from "./alertLog-filter";

const PAGE_SIZE = 50;

const ackFilter = z.enum(["all", "acked", "unacked"]).default("all");

export const alertLogRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        ruleKey: z.string().optional(),
        ack: ackFilter,
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = buildAlertLogWhere(input);
      const [items, total] = await Promise.all([
        ctx.prisma.alertLog.findMany({
          where,
          orderBy: { triggeredAt: "desc" },
          skip: (input.page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        ctx.prisma.alertLog.count({ where }),
      ]);
      return { items, total, pageSize: PAGE_SIZE };
    }),

  ack: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.alertLog.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "alert not found" });
      if (existing.ackedAt) return existing; // idempotent
      const updated = await ctx.prisma.alertLog.update({
        where: { id: input.id },
        data: { ackedAt: new Date(), ackedBy: ctx.userId },
      });
      return updated;
    }),
});
