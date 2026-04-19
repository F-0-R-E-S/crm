import { adminProcedure, router } from "@/server/trpc";
import { z } from "zod";

export const auditRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        entity: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.entity ? { entity: input.entity } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
      };
      const [items, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * 50,
          take: 50,
          include: { user: { select: { email: true } } },
        }),
        ctx.prisma.auditLog.count({ where }),
      ]);
      return { items, total };
    }),
});
