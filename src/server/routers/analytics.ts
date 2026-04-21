import { memoizeCached } from "@/server/analytics/cache";
import { bucketToRange, buildLeadWhere } from "@/server/analytics/drilldown";
import { AnalyticsFilters, AnalyticsParams, GroupBy, MetricKey } from "@/server/analytics/params";
import {
  canonicalStatusBreakdown,
  conversionBreakdown,
  metricSeries,
  rejectBreakdown,
  revenueBreakdown,
} from "@/server/analytics/service";
import { prisma } from "@/server/db";
import { protectedProcedure, router } from "@/server/trpc";
import { z } from "zod";

export const analyticsRouter = router({
  metricSeries: protectedProcedure
    .input(AnalyticsParams)
    .query(async ({ input }) => memoizeCached("metricSeries", input, () => metricSeries(input))),
  conversionBreakdown: protectedProcedure
    .input(AnalyticsParams)
    .query(async ({ input }) =>
      memoizeCached("conversionBreakdown", input, () => conversionBreakdown(input)),
    ),
  rejectBreakdown: protectedProcedure
    .input(AnalyticsParams)
    .query(async ({ input }) =>
      memoizeCached("rejectBreakdown", input, () => rejectBreakdown(input)),
    ),
  revenueBreakdown: protectedProcedure
    .input(AnalyticsParams)
    .query(async ({ input }) =>
      memoizeCached("revenueBreakdown", input, () => revenueBreakdown(input)),
    ),
  canonicalStatusBreakdown: protectedProcedure
    .input(AnalyticsParams)
    .query(async ({ input }) =>
      memoizeCached("canonicalStatusBreakdown", input, () => canonicalStatusBreakdown(input)),
    ),

  // --- Presets ---
  savePreset: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(64), query: z.unknown() }))
    .mutation(async ({ ctx, input }) =>
      prisma.analyticsPreset.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          query: input.query as object,
        },
      }),
    ),

  listPresets: protectedProcedure.query(async ({ ctx }) =>
    prisma.analyticsPreset.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
    }),
  ),

  deletePreset: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) =>
      prisma.analyticsPreset.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      }),
    ),

  renamePreset: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      // Throws P2002 on unique collision (userId, name).
      return prisma.analyticsPreset.update({
        where: { id: input.id, userId: ctx.userId },
        data: { name: input.name },
      });
    }),

  setDefaultPreset: protectedProcedure
    .input(z.object({ id: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.$transaction([
        prisma.analyticsPreset.updateMany({
          where: { userId: ctx.userId, isDefault: true },
          data: { isDefault: false },
        }),
        ...(input.id
          ? [
              prisma.analyticsPreset.update({
                where: { id: input.id, userId: ctx.userId },
                data: { isDefault: true },
              }),
            ]
          : []),
      ]);
      return { ok: true as const };
    }),

  getDefaultPreset: protectedProcedure.query(async ({ ctx }) =>
    prisma.analyticsPreset.findFirst({
      where: { userId: ctx.userId, isDefault: true },
    }),
  ),

  // --- Drill-down ---
  drillDown: protectedProcedure
    .input(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("metric"),
          metric: MetricKey,
          bucket: z.string(),
          groupBy: GroupBy,
          from: z.coerce.date(),
          to: z.coerce.date(),
          filters: AnalyticsFilters,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(50),
        }),
        z.object({
          kind: z.literal("conversion"),
          stage: z.enum(["received", "validated", "pushed", "accepted", "ftd", "rejected"]),
          from: z.coerce.date(),
          to: z.coerce.date(),
          filters: AnalyticsFilters,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(50),
        }),
        z.object({
          kind: z.literal("reject"),
          reason: z.string(),
          from: z.coerce.date(),
          to: z.coerce.date(),
          filters: AnalyticsFilters,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(50),
        }),
        z.object({
          kind: z.literal("revenue"),
          bucket: z.string().optional(),
          groupBy: GroupBy.optional(),
          from: z.coerce.date(),
          to: z.coerce.date(),
          filters: AnalyticsFilters,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(50),
        }),
        z.object({
          kind: z.literal("canonical-status"),
          canonicalStatus: z.string().min(1),
          from: z.coerce.date(),
          to: z.coerce.date(),
          filters: AnalyticsFilters,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(50),
        }),
      ]),
    )
    .query(async ({ input }) => {
      let from = input.from;
      let to = input.to;
      let extra: Partial<Record<"affiliateId" | "brokerId" | "geo", string>> = {};
      if (input.kind === "metric") {
        const r = bucketToRange(input.bucket, input.groupBy, input.from, input.to);
        from = r.from;
        to = r.to;
        extra = r.extra;
      } else if (input.kind === "revenue" && input.bucket && input.groupBy) {
        const r = bucketToRange(input.bucket, input.groupBy, input.from, input.to);
        from = r.from;
        to = r.to;
        extra = r.extra;
      }
      const where = buildLeadWhere(input.kind, {
        from,
        to,
        filters: input.filters,
        metric: input.kind === "metric" ? input.metric : undefined,
        stage: input.kind === "conversion" ? input.stage : undefined,
        reason: input.kind === "reject" ? input.reason : undefined,
        canonicalStatus: input.kind === "canonical-status" ? input.canonicalStatus : undefined,
        affiliateId: extra.affiliateId,
        brokerId: extra.brokerId,
        geo: extra.geo,
      });
      const [rows, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          select: {
            id: true,
            externalLeadId: true,
            email: true,
            phone: true,
            geo: true,
            state: true,
            rejectReason: true,
            affiliateId: true,
            brokerId: true,
            createdAt: true,
            qualityScore: true,
            fraudScore: true,
          },
        }),
        prisma.lead.count({ where }),
      ]);
      const items = rows.map((r) => ({
        id: r.id,
        externalId: r.externalLeadId,
        email: r.email,
        phone: r.phone,
        geo: r.geo,
        state: r.state,
        rejectReason: r.rejectReason,
        affiliateId: r.affiliateId,
        brokerId: r.brokerId,
        createdAt: r.createdAt,
        qualityScore: r.qualityScore,
        fraudScore: r.fraudScore,
      }));
      return { items, total };
    }),
});
