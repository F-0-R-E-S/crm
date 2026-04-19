import { z } from "zod";
import { DealStage } from "@prisma/client";
import { router, protectedProcedure } from "@/server/trpc";

const dealInput = z.object({
  title: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  stage: z.nativeEnum(DealStage).default(DealStage.NEW),
  closeDate: z.date().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
});

export const dealRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          stage: z.nativeEnum(DealStage).optional(),
          take: z.number().min(1).max(200).default(50),
          skip: z.number().min(0).default(0),
        })
        .default({}),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.deal.findMany({
        where: input.stage ? { stage: input.stage } : undefined,
        take: input.take,
        skip: input.skip,
        orderBy: { updatedAt: "desc" },
        include: { contact: true, company: true },
      }),
    ),

  pipeline: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.deal.groupBy({
      by: ["stage"],
      _sum: { amount: true },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      stage: r.stage,
      count: r._count._all,
      total: Number(r._sum.amount ?? 0),
    }));
  }),

  create: protectedProcedure.input(dealInput).mutation(({ ctx, input }) =>
    ctx.prisma.deal.create({
      data: { ...input, amount: input.amount.toFixed(2), ownerId: ctx.userId },
    }),
  ),

  setStage: protectedProcedure
    .input(z.object({ id: z.string(), stage: z.nativeEnum(DealStage) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.deal.update({
        where: { id: input.id },
        data: { stage: input.stage },
      }),
    ),

  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.deal.delete({ where: { id: input } }),
  ),
});
