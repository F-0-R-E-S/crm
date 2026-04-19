import { writeAuditLog } from "@/server/audit";
import { adminProcedure, router } from "@/server/trpc";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const userRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ),
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["ADMIN", "OPERATOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.user.create({
        data: {
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, 10),
          role: input.role,
        },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "user.create",
        entity: "User",
        entityId: row.id,
        diff: { email: input.email, role: input.role },
      });
      return { id: row.id, email: row.email, role: row.role };
    }),
  setRole: adminProcedure
    .input(z.object({ id: z.string(), role: z.enum(["ADMIN", "OPERATOR"]) }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { role: input.role },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "user.setRole",
        entity: "User",
        entityId: input.id,
        diff: { role: input.role },
      });
      return { id: row.id, role: row.role };
    }),
  resetPassword: adminProcedure
    .input(z.object({ id: z.string(), password: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: input.id },
        data: { passwordHash: await bcrypt.hash(input.password, 10) },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "user.resetPassword",
        entity: "User",
        entityId: input.id,
      });
    }),
});
