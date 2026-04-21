import { createHash, randomBytes } from "node:crypto";
import { writeAuditLog } from "@/server/audit";
import { redact, redactMany } from "@/server/rbac/redact";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const affiliateRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.affiliate.findMany({ orderBy: { createdAt: "desc" } });
    const role = (ctx.role ?? "OPERATOR") as UserRole;
    return redactMany(
      rows as unknown as Record<string, unknown>[],
      role,
      "Affiliate",
    ) as typeof rows;
  }),

  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const row = await ctx.prisma.affiliate.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        apiKeys: { orderBy: { createdAt: "desc" } },
        outboundPostbacks: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    const role = (ctx.role ?? "OPERATOR") as UserRole;
    return redact(row as unknown as Record<string, unknown>, role, "Affiliate") as typeof row;
  }),

  stats: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 3600 * 1000);
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // KPI counters
    const [leads24h, ftds24h, rejects24h, capRow] = await Promise.all([
      ctx.prisma.lead.count({
        where: { affiliateId: input.id, receivedAt: { gte: since } },
      }),
      ctx.prisma.lead.count({
        where: { affiliateId: input.id, ftdAt: { gte: since } },
      }),
      ctx.prisma.lead.count({
        where: { affiliateId: input.id, state: "REJECTED", receivedAt: { gte: since } },
      }),
      ctx.prisma.dailyCap.findFirst({
        where: { scope: "AFFILIATE", scopeId: input.id, day: todayUtc },
        select: { count: true },
      }),
    ]);

    // Hourly series — 24 buckets, aligned to the hour containing `now`.
    type Row = { bucket: Date; leads: bigint; ftds: bigint; rejects: bigint };
    const rows = await ctx.prisma.$queryRaw<Row[]>`
        SELECT
          date_trunc('hour', "receivedAt") AS bucket,
          COUNT(*)::bigint AS leads,
          COUNT(*) FILTER (WHERE "ftdAt" IS NOT NULL AND "ftdAt" >= ${since})::bigint AS ftds,
          COUNT(*) FILTER (WHERE "state" = 'REJECTED')::bigint AS rejects
        FROM "Lead"
        WHERE "affiliateId" = ${input.id}
          AND "receivedAt" >= ${since}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
    const byBucket = new Map(
      rows.map((r) => [
        new Date(r.bucket).toISOString(),
        { leads: Number(r.leads), ftds: Number(r.ftds), rejects: Number(r.rejects) },
      ]),
    );
    const series = Array.from({ length: 24 }, (_, i) => {
      const t = new Date(now.getTime() - (23 - i) * 3600 * 1000);
      t.setUTCMinutes(0, 0, 0);
      const key = t.toISOString();
      const v = byBucket.get(key) ?? { leads: 0, ftds: 0, rejects: 0 };
      return { ts: key, ...v };
    });

    return {
      kpi: {
        leads24h,
        ftds24h,
        rejects24h,
        capUsed: capRow?.count ?? 0,
      },
      series,
    };
  }),

  /**
   * Daily average qualityScore for an affiliate across the last N days.
   * Used by /dashboard/affiliates/[id] quality-trend chart.
   */
  qualityTrend: protectedProcedure
    .input(z.object({ affiliateId: z.string(), days: z.number().int().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86_400_000);
      type Row = { day: Date; avg_q: number | null; leads: bigint };
      const rows = await ctx.prisma.$queryRaw<Row[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               AVG("qualityScore")::float AS avg_q,
               COUNT(*)::bigint AS leads
        FROM "Lead"
        WHERE "affiliateId" = ${input.affiliateId}
          AND "qualityScore" IS NOT NULL
          AND "createdAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `;
      return rows.map((r) => ({
        date: new Date(r.day).toISOString().slice(0, 10),
        avgQ: r.avg_q == null ? null : Math.round(r.avg_q * 100) / 100,
        leads: Number(r.leads),
      }));
    }),

  /**
   * Per-affiliate 7-day sparkline + current avg, for /dashboard/affiliates list.
   * Returns one row per affiliate; 0-lead affiliates get `avg7d = null` and
   * empty sparkline so UI can fall back.
   */
  qualitySparklines: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 7 * 86_400_000);
    type Row = { affiliate_id: string; day: Date; avg_q: number | null };
    const rows = await ctx.prisma.$queryRaw<Row[]>`
      SELECT "affiliateId" AS affiliate_id,
             date_trunc('day', "createdAt") AS day,
             AVG("qualityScore")::float AS avg_q
      FROM "Lead"
      WHERE "qualityScore" IS NOT NULL
        AND "createdAt" >= ${since}
      GROUP BY "affiliateId", day
      ORDER BY "affiliateId", day
    `;
    const byAff = new Map<string, Array<{ date: string; avgQ: number }>>();
    for (const r of rows) {
      if (r.avg_q == null) continue;
      const list = byAff.get(r.affiliate_id) ?? [];
      list.push({
        date: new Date(r.day).toISOString().slice(0, 10),
        avgQ: Math.round(r.avg_q * 100) / 100,
      });
      byAff.set(r.affiliate_id, list);
    }
    const out: Array<{
      affiliateId: string;
      points: Array<{ date: string; avgQ: number }>;
      avg7d: number | null;
    }> = [];
    for (const [affId, points] of byAff) {
      const sum = points.reduce((a, p) => a + p.avgQ, 0);
      const avg = points.length ? Math.round((sum / points.length) * 10) / 10 : null;
      out.push({ affiliateId: affId, points, avg7d: avg });
    }
    return out;
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
