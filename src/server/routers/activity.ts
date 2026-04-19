import { z } from "zod";
import { ActivityType } from "@prisma/client";
import { router, protectedProcedure } from "@/server/trpc";

const activityInput = z.object({
  type: z.nativeEnum(ActivityType),
  subject: z.string().min(1),
  description: z.string().optional().nullable(),
  dueAt: z.date().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export const activityRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          mine: z.boolean().default(true),
          open: z.boolean().default(true),
          take: z.number().min(1).max(200).default(50),
        })
        .default({}),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.activity.findMany({
        where: {
          assigneeId: input.mine ? ctx.userId : undefined,
          completedAt: input.open ? null : undefined,
        },
        take: input.take,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        include: { contact: true, deal: true },
      }),
    ),

  create: protectedProcedure.input(activityInput).mutation(({ ctx, input }) =>
    ctx.prisma.activity.create({
      data: { ...input, assigneeId: ctx.userId },
    }),
  ),

  complete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.activity.update({
      where: { id: input },
      data: { completedAt: new Date() },
    }),
  ),

  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.activity.delete({ where: { id: input } }),
  ),
});
