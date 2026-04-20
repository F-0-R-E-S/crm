import { funnelCounts } from "@/lib/funnel-counts";
import { writeAuditLog } from "@/server/audit";
import { JOB_NAMES, getBoss, startBossOnce } from "@/server/jobs/queue";
import { redact, redactMany } from "@/server/rbac/redact";
import { protectedProcedure, router } from "@/server/trpc";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

const ListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).default(50),
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
    const role = (ctx.role ?? "OPERATOR") as UserRole;
    return {
      items: redactMany(
        items as unknown as (typeof items)[number] & Record<string, unknown>[],
        role,
        "Lead",
      ) as typeof items,
      total,
    };
  }),

  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const row = await ctx.prisma.lead.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        affiliate: true,
        broker: true,
        events: { orderBy: { createdAt: "asc" } },
        outboundPostbacks: { orderBy: { createdAt: "desc" } },
      },
    });
    const role = (ctx.role ?? "OPERATOR") as UserRole;
    return redact(row as unknown as Record<string, unknown>, role, "Lead") as typeof row;
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

  funnelCounts: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const leads = await ctx.prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: { state: true, rejectReason: true },
    });
    return funnelCounts(leads as never);
  }),

  brokerPerformance: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const brokers = await ctx.prisma.broker.findMany({
      include: {
        leads: { where: { createdAt: { gte: since } }, select: { state: true, createdAt: true } },
      },
    });
    return brokers.map((b) => {
      const pushed = b.leads.filter((l) =>
        ["PUSHED", "ACCEPTED", "FTD", "DECLINED"].includes(l.state),
      ).length;
      const ftd = b.leads.filter((l) => l.state === "FTD").length;
      const failed = b.leads.filter((l) => l.state === "FAILED").length;
      const days: number[] = Array.from({ length: 7 }, () => 0);
      for (const l of b.leads) {
        const daysAgo = Math.floor((Date.now() - l.createdAt.getTime()) / (24 * 3600 * 1000));
        if (daysAgo < 7) days[6 - daysAgo]++;
      }
      return {
        id: b.id,
        name: b.name,
        pushed,
        ftd,
        failed,
        last7: days,
        ftdPct: pushed > 0 ? Math.round((ftd / pushed) * 1000) / 10 : 0,
      };
    });
  }),

  topGeos: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const groups = await ctx.prisma.lead.groupBy({
      by: ["geo", "state"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });
    const byGeo = new Map<string, { volume: number; ftd: number }>();
    for (const g of groups) {
      const cur = byGeo.get(g.geo) ?? { volume: 0, ftd: 0 };
      cur.volume += g._count._all;
      if (g.state === "FTD") cur.ftd += g._count._all;
      byGeo.set(g.geo, cur);
    }
    return Array.from(byGeo.entries())
      .map(([geo, v]) => ({ geo, ...v }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);
  }),
});
