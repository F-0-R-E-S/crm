import { writeAuditLog } from "@/server/audit";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { z } from "zod";

const Kind = z.enum(["IP_CIDR", "IP_EXACT", "EMAIL_DOMAIN", "PHONE_E164"]);

export const blacklistRouter = router({
  list: protectedProcedure.input(z.object({ kind: Kind }).optional()).query(({ ctx, input }) =>
    ctx.prisma.blacklist.findMany({
      where: input?.kind ? { kind: input.kind } : {},
      orderBy: { createdAt: "desc" },
    }),
  ),
  add: adminProcedure
    .input(z.object({ kind: Kind, value: z.string().min(1), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.blacklist.create({
        data: { ...input, createdBy: ctx.userId },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "blacklist.add",
        entity: "Blacklist",
        entityId: row.id,
        diff: input,
      });
      return row;
    }),
  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.prisma.blacklist.delete({ where: { id: input.id } });
    await writeAuditLog({
      userId: ctx.userId,
      action: "blacklist.remove",
      entity: "Blacklist",
      entityId: input.id,
    });
  }),
});
