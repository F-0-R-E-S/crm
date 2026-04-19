import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { writeAuditLog } from "@/server/audit";
import { getBoss, JOB_NAMES, startBossOnce } from "@/server/jobs/queue";

const ListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  state: z.string().optional(),
  geo: z.string().length(2).optional(),
  affiliateId: z.string().optional(),
  brokerId: z.string().optional(),
  rejectReason: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const leadRouter = router({
  list: protectedProcedure.input(ListInput).query(async ({ ctx, input }) => {
    const where = {
      ...(input.state ? { state: input.state as never } : {}),
      ...(input.geo ? { geo: input.geo } : {}),
      ...(input.affiliateId ? { affiliateId: input.affiliateId } : {}),
      ...(input.brokerId ? { brokerId: input.brokerId } : {}),
      ...(input.rejectReason ? { rejectReason: input.rejectReason } : {}),
      ...(input.from || input.to
        ? {
            createdAt: {
              ...(input.from ? { gte: new Date(input.from) } : {}),
              ...(input.to ? { lte: new Date(input.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      ctx.prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          affiliate: { select: { name: true } },
          broker: { select: { name: true } },
        },
      }),
      ctx.prisma.lead.count({ where }),
    ]);
    return { items, total };
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.lead.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          affiliate: true,
          broker: true,
          events: { orderBy: { createdAt: "asc" } },
          outboundPostbacks: { orderBy: { createdAt: "desc" } },
        },
      });
    }),

  counters: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [leadsToday, ftdsToday, activeBrokers, rejectsToday] = await Promise.all([
      ctx.prisma.lead.count({ where: { createdAt: { gte: today } } }),
      ctx.prisma.lead.count({ where: { state: "FTD", ftdAt: { gte: today } } }),
      ctx.prisma.broker.count({ where: { isActive: true } }),
      ctx.prisma.lead.count({ where: { state: "REJECTED", createdAt: { gte: today } } }),
    ]);
    return { leadsToday, ftdsToday, activeBrokers, rejectsToday };
  }),

  setState: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        state: z.enum(["ACCEPTED", "DECLINED", "FTD", "REJECTED"]),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.prisma.lead.findUniqueOrThrow({ where: { id: input.id } });
      const updated = await ctx.prisma.lead.update({
        where: { id: input.id },
        data: {
          state: input.state,
          rejectReason: input.reason ?? (input.state === "REJECTED" ? "manual" : null),
          ...(input.state === "FTD" ? { ftdAt: new Date() } : {}),
          ...(input.state === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
        },
      });
      await ctx.prisma.leadEvent.create({
        data: {
          leadId: input.id,
          kind: "MANUAL_OVERRIDE",
          meta: { from: before.state, to: input.state, by: ctx.userId },
        },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "lead.setState",
        entity: "Lead",
        entityId: input.id,
        diff: { from: before.state, to: input.state },
      });
      return updated;
    }),

  repush: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.lead.update({
        where: { id: input.id },
        data: { state: "NEW", rejectReason: null },
      });
      await startBossOnce();
      const boss = getBoss();
      await boss.send(JOB_NAMES.pushLead, { leadId: input.id, traceId: input.id });
      await writeAuditLog({
        userId: ctx.userId,
        action: "lead.repush",
        entity: "Lead",
        entityId: input.id,
      });
      return { ok: true };
    }),

  resendOutboundPostback: protectedProcedure
    .input(z.object({ outboundId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.outboundPostback.findUniqueOrThrow({
        where: { id: input.outboundId },
      });
      await startBossOnce();
      const boss = getBoss();
      await boss.send(JOB_NAMES.notifyAffiliate, { leadId: row.leadId, event: row.event });
      await writeAuditLog({
        userId: ctx.userId,
        action: "outbound.resend",
        entity: "OutboundPostback",
        entityId: input.outboundId,
      });
      return { ok: true };
    }),
});
