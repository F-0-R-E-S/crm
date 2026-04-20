import { memoizeCached } from "@/server/analytics/cache";
import { AnalyticsParams } from "@/server/analytics/params";
import {
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
});
