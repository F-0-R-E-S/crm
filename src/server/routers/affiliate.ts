import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { router, protectedProcedure, adminProcedure } from "@/server/trpc";
import { writeAuditLog } from "@/server/audit";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const affiliateRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.affiliate.findMany({ orderBy: { createdAt: "desc" } });
  }),

  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.affiliate.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        apiKeys: { orderBy: { createdAt: "desc" } },
        outboundPostbacks: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        contactEmail: z.string().email().optional(),
        totalDailyCap: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.affiliate.create({ data: input });
      await writeAuditLog({
        userId: ctx.userId,
        action: "affiliate.create",
        entity: "Affiliate",
        entityId: row.id,
        diff: { after: input },
      });
      return row;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        contactEmail: z.string().email().nullable().optional(),
        totalDailyCap: z.number().int().positive().nullable().optional(),
        isActive: z.boolean().optional(),
        postbackUrl: z.string().url().nullable().optional(),
        postbackSecret: z.string().nullable().optional(),
        postbackEvents: z
          .array(z.enum(["lead_pushed", "ftd", "accepted", "declined", "failed"]))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const before = await ctx.prisma.affiliate.findUniqueOrThrow({ where: { id } });
      const after = await ctx.prisma.affiliate.update({ where: { id }, data: patch });
      await writeAuditLog({
        userId: ctx.userId,
        action: "affiliate.update",
        entity: "Affiliate",
        entityId: id,
        diff: { before, after },
      });
      return after;
    }),

  generateApiKey: adminProcedure
    .input(z.object({ affiliateId: z.string(), label: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const raw = `ak_${randomBytes(24).toString("hex")}`;
      const row = await ctx.prisma.apiKey.create({
        data: {
          affiliateId: input.affiliateId,
          keyHash: sha(raw),
          keyPrefix: raw.slice(0, 12),
          label: input.label,
        },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "apikey.create",
        entity: "ApiKey",
        entityId: row.id,
      });
      return { ...row, rawKey: raw }; // raw returned ONCE
    }),

  revokeApiKey: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.apiKey.update({
        where: { id: input.id },
        data: { isRevoked: true },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "apikey.revoke",
        entity: "ApiKey",
        entityId: input.id,
      });
      return row;
    }),
});
