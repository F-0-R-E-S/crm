import { writeAuditLog } from "@/server/audit";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { z } from "zod";

export const rotationRouter = router({
  listByGeo: protectedProcedure.query(async ({ ctx }) => {
    const rules = await ctx.prisma.rotationRule.findMany({
      orderBy: [{ geo: "asc" }, { priority: "asc" }],
      include: { broker: { select: { id: true, name: true, isActive: true } } },
    });
    const byGeo: Record<string, typeof rules> = {};
    for (const r of rules) (byGeo[r.geo] ??= []).push(r);
    return byGeo;
  }),

  create: adminProcedure
    .input(
      z.object({
        geo: z.string().length(2),
        brokerId: z.string(),
        priority: z.number().int().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.rotationRule.create({
        data: { ...input, geo: input.geo.toUpperCase() },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "rotation.create",
        entity: "RotationRule",
        entityId: row.id,
      });
      return row;
    }),

  reorder: adminProcedure
    .input(z.object({ id: z.string(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.rotationRule.findUniqueOrThrow({ where: { id: input.id } });
      const siblings = await ctx.prisma.rotationRule.findMany({
        where: { geo: rule.geo },
        orderBy: { priority: "asc" },
      });
      const idx = siblings.findIndex((s) => s.id === rule.id);
      const swapIdx = input.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return rule;
      const other = siblings[swapIdx];
      await ctx.prisma.$transaction([
        ctx.prisma.rotationRule.update({
          where: { id: rule.id },
          data: { priority: other.priority },
        }),
        ctx.prisma.rotationRule.update({
          where: { id: other.id },
          data: { priority: rule.priority },
        }),
      ]);
      await writeAuditLog({
        userId: ctx.userId,
        action: "rotation.reorder",
        entity: "RotationRule",
        entityId: rule.id,
      });
      return rule;
    }),

  toggle: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.rotationRule.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "rotation.toggle",
        entity: "RotationRule",
        entityId: input.id,
      });
      return row;
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.prisma.rotationRule.delete({ where: { id: input.id } });
    await writeAuditLog({
      userId: ctx.userId,
      action: "rotation.delete",
      entity: "RotationRule",
      entityId: input.id,
    });
  }),
});
