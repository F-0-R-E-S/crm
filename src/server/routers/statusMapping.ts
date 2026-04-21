import { writeAuditLog } from "@/server/audit";
import { invalidateStatusMappingCache } from "@/server/status-groups/classify";
import { suggestMappings } from "@/server/status-groups/suggest";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const statusMappingRouter = router({
  // --- Canonical statuses ---
  listCanonical: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.canonicalStatus.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  }),

  // --- Per-broker mappings ---
  listForBroker: protectedProcedure
    .input(z.object({ brokerId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.statusMapping.findMany({
        where: { brokerId: input.brokerId },
        include: { canonicalStatus: true },
        orderBy: { rawStatus: "asc" },
      });
    }),

  /**
   * List raw statuses seen on this broker's leads in the last N days, grouped
   * by frequency. Joined with current mapping (if any) + unmapped flag.
   */
  observedRawStatuses: protectedProcedure
    .input(
      z.object({
        brokerId: z.string(),
        days: z.number().int().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86_400_000);
      type Row = { raw: string; n: bigint };
      const rows = await ctx.prisma.$queryRaw<Row[]>`
        SELECT "lastBrokerStatus" AS raw, COUNT(*)::bigint AS n
        FROM "Lead"
        WHERE "brokerId" = ${input.brokerId}
          AND "lastBrokerStatus" IS NOT NULL
          AND "lastBrokerStatus" <> ''
          AND "createdAt" >= ${since}
        GROUP BY "lastBrokerStatus"
        ORDER BY n DESC
      `;
      const mappings = await ctx.prisma.statusMapping.findMany({
        where: { brokerId: input.brokerId },
        include: { canonicalStatus: { select: { code: true, category: true } } },
      });
      const byRaw = new Map(mappings.map((m) => [m.rawStatus, m]));
      return rows.map((r) => ({
        rawStatus: r.raw,
        count: Number(r.n),
        mapping: byRaw.get(r.raw) ?? null,
      }));
    }),

  upsert: adminProcedure
    .input(
      z.object({
        brokerId: z.string(),
        rawStatus: z.string().min(1),
        canonicalStatusId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canon = await ctx.prisma.canonicalStatus.findUnique({
        where: { id: input.canonicalStatusId },
      });
      if (!canon) throw new TRPCError({ code: "BAD_REQUEST", message: "unknown_canonical" });
      const row = await ctx.prisma.statusMapping.upsert({
        where: {
          brokerId_rawStatus: { brokerId: input.brokerId, rawStatus: input.rawStatus },
        },
        update: { canonicalStatusId: input.canonicalStatusId, updatedBy: ctx.userId },
        create: {
          brokerId: input.brokerId,
          rawStatus: input.rawStatus,
          canonicalStatusId: input.canonicalStatusId,
          updatedBy: ctx.userId,
        },
      });
      invalidateStatusMappingCache(input.brokerId);
      await writeAuditLog({
        userId: ctx.userId,
        action: "status_mapping.upsert",
        entity: "StatusMapping",
        entityId: row.id,
        diff: { rawStatus: input.rawStatus, canonicalStatusId: input.canonicalStatusId },
      });
      return row;
    }),

  bulkUpsert: adminProcedure
    .input(
      z.object({
        brokerId: z.string(),
        items: z
          .array(
            z.object({
              rawStatus: z.string().min(1),
              canonicalStatusId: z.string().min(1),
            }),
          )
          .min(1)
          .max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let written = 0;
      for (const item of input.items) {
        await ctx.prisma.statusMapping.upsert({
          where: {
            brokerId_rawStatus: { brokerId: input.brokerId, rawStatus: item.rawStatus },
          },
          update: { canonicalStatusId: item.canonicalStatusId, updatedBy: ctx.userId },
          create: {
            brokerId: input.brokerId,
            rawStatus: item.rawStatus,
            canonicalStatusId: item.canonicalStatusId,
            updatedBy: ctx.userId,
          },
        });
        written += 1;
      }
      invalidateStatusMappingCache(input.brokerId);
      await writeAuditLog({
        userId: ctx.userId,
        action: "status_mapping.bulk_upsert",
        entity: "StatusMapping",
        entityId: input.brokerId,
        diff: { count: written },
      });
      return { written };
    }),

  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const row = await ctx.prisma.statusMapping.delete({ where: { id: input.id } });
    invalidateStatusMappingCache(row.brokerId);
    await writeAuditLog({
      userId: ctx.userId,
      action: "status_mapping.remove",
      entity: "StatusMapping",
      entityId: input.id,
    });
    return { ok: true };
  }),

  suggestFor: adminProcedure
    .input(z.object({ brokerId: z.string(), days: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86_400_000);
      type Row = { raw: string };
      const raws = await ctx.prisma.$queryRaw<Row[]>`
        SELECT DISTINCT "lastBrokerStatus" AS raw
        FROM "Lead"
        WHERE "brokerId" = ${input.brokerId}
          AND "lastBrokerStatus" IS NOT NULL
          AND "lastBrokerStatus" <> ''
          AND "createdAt" >= ${since}
      `;
      const canons = await ctx.prisma.canonicalStatus.findMany({
        select: { id: true, code: true, label: true },
      });
      const existing = await ctx.prisma.statusMapping.findMany({
        where: { brokerId: input.brokerId },
        select: { rawStatus: true },
      });
      const mapped = new Set(existing.map((r) => r.rawStatus));
      const unmapped = raws.map((r) => r.raw).filter((r) => !mapped.has(r));
      return suggestMappings(unmapped, canons);
    }),

  /** Coverage = 1 − (volume unmapped / total volume) for last 30d. */
  coverageForBroker: protectedProcedure
    .input(z.object({ brokerId: z.string(), days: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86_400_000);
      type Row = { raw: string; n: bigint };
      const rows = await ctx.prisma.$queryRaw<Row[]>`
        SELECT "lastBrokerStatus" AS raw, COUNT(*)::bigint AS n
        FROM "Lead"
        WHERE "brokerId" = ${input.brokerId}
          AND "lastBrokerStatus" IS NOT NULL
          AND "lastBrokerStatus" <> ''
          AND "createdAt" >= ${since}
        GROUP BY "lastBrokerStatus"
      `;
      const mapped = await ctx.prisma.statusMapping.findMany({
        where: { brokerId: input.brokerId },
        select: { rawStatus: true },
      });
      const mappedSet = new Set(mapped.map((m) => m.rawStatus));
      let total = 0;
      let mappedVolume = 0;
      for (const r of rows) {
        const n = Number(r.n);
        total += n;
        if (mappedSet.has(r.raw)) mappedVolume += n;
      }
      return {
        totalVolume: total,
        mappedVolume,
        unmappedVolume: total - mappedVolume,
        coveragePct: total === 0 ? 1 : mappedVolume / total,
      };
    }),

  /**
   * Backfill Lead.canonicalStatus for an existing broker's leads based on
   * current mappings. Runs inline (no pg-boss enqueue) — the admin UI
   * operates on a handful of brokers and ~100k leads tops; a single
   * `UPDATE ... FROM` is O(ms).
   */
  backfillLeads: adminProcedure
    .input(z.object({ brokerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Reset then populate. We use two raw SQL statements.
      // Mapped raws → canonical code.
      const mappings = await ctx.prisma.statusMapping.findMany({
        where: { brokerId: input.brokerId },
        include: { canonicalStatus: { select: { code: true } } },
      });
      let updated = 0;
      for (const m of mappings) {
        const res = await ctx.prisma.lead.updateMany({
          where: { brokerId: input.brokerId, lastBrokerStatus: m.rawStatus },
          data: { canonicalStatus: m.canonicalStatus.code },
        });
        updated += res.count;
      }
      // Everything else with a status → unmapped
      const unmappedRes = await ctx.prisma.lead.updateMany({
        where: {
          brokerId: input.brokerId,
          lastBrokerStatus: { notIn: mappings.map((m) => m.rawStatus), not: null },
        },
        data: { canonicalStatus: "unmapped" },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "status_mapping.backfill",
        entity: "Broker",
        entityId: input.brokerId,
        diff: { updated, unmapped: unmappedRes.count },
      });
      return { updated, unmapped: unmappedRes.count };
    }),
});
