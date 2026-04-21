import { writeAuditLog } from "@/server/audit";
import { prisma } from "@/server/db";
import { validateChanceSum, validateSlotBounds } from "@/server/routing/algorithm/slots-chance";
import { listFlowCaps, upsertFlowCaps } from "@/server/routing/flow/caps-repository";
import { CapDefinitionInputSchema } from "@/server/routing/flow/caps-schema";
import { FlowGraphSchema } from "@/server/routing/flow/model";
import { archiveFlow, publishFlow } from "@/server/routing/flow/publish";
import {
  createDraftFlow,
  listFlows,
  loadFlowById,
  updateDraftGraph,
} from "@/server/routing/flow/repository";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const routingRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional() }).optional())
    .query(({ input }) => listFlows(input)),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => loadFlowById(input.id)),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        timezone: z.string().min(1),
        graph: FlowGraphSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const f = await createDraftFlow({ ...input, createdBy: ctx.userId });
      await writeAuditLog({
        userId: ctx.userId,
        action: "flow.create",
        entity: "Flow",
        entityId: f.id,
      });
      return f;
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), graph: FlowGraphSchema }))
    .mutation(async ({ ctx, input }) => {
      const f = await updateDraftGraph(input.id, input.graph);
      await writeAuditLog({
        userId: ctx.userId,
        action: "flow.update",
        entity: "Flow",
        entityId: input.id,
      });
      return f;
    }),

  publish: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const f = await publishFlow(input.id, ctx.userId);
    await writeAuditLog({
      userId: ctx.userId,
      action: "flow.publish",
      entity: "Flow",
      entityId: input.id,
    });
    return f;
  }),

  archive: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const f = await archiveFlow(input.id, ctx.userId);
    await writeAuditLog({
      userId: ctx.userId,
      action: "flow.archive",
      entity: "Flow",
      entityId: input.id,
    });
    return f;
  }),

  listCaps: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .query(({ input }) => listFlowCaps(input.flowId)),

  updateCaps: adminProcedure
    .input(
      z.object({
        flowId: z.string(),
        caps: z.array(CapDefinitionInputSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let saved: Awaited<ReturnType<typeof upsertFlowCaps>>;
      try {
        saved = await upsertFlowCaps(input.flowId, input.caps);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "flow_not_found")
          throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found" });
        if (msg === "flow_published")
          throw new TRPCError({
            code: "CONFLICT",
            message: "Cannot mutate caps on a PUBLISHED flow — create a new draft version first",
          });
        if (msg === "flow_archived")
          throw new TRPCError({ code: "CONFLICT", message: "Flow is archived" });
        throw e;
      }
      await writeAuditLog({
        userId: ctx.userId,
        action: "flow.updateCaps",
        entity: "Flow",
        entityId: input.flowId,
      });
      return saved;
    }),

  // Algorithm config: returns flow-scope + branch-scope configs for the
  // latest draft version of a flow. Used by the inspector to show WRR
  // weights / Slots-Chance percentages inline on broker-pool nodes.
  listAlgoConfigs: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .query(async ({ input }) => {
      const flow = await prisma.flow.findUnique({
        where: { id: input.flowId },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      });
      if (!flow) throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found" });
      const latest = flow.versions[0];
      if (!latest) return [];
      return prisma.flowAlgorithmConfig.findMany({
        where: { flowVersionId: latest.id },
        orderBy: [{ scope: "asc" }, { scopeRefId: "asc" }],
      });
    }),

  upsertAlgoConfig: adminProcedure
    .input(
      z.object({
        flowId: z.string(),
        scope: z.enum(["FLOW", "BRANCH"]),
        scopeRefId: z.string().nullable().optional(),
        mode: z.enum(["WEIGHTED_ROUND_ROBIN", "SLOTS_CHANCE"]),
        params: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const flow = await prisma.flow.findUnique({
        where: { id: input.flowId },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      });
      if (!flow) throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found" });
      const latest = flow.versions[0];
      if (!latest) throw new TRPCError({ code: "CONFLICT", message: "No draft version to edit" });
      if (flow.status === "PUBLISHED")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot edit algorithm on a PUBLISHED flow — create a new draft first",
        });

      if (input.mode === "SLOTS_CHANCE") {
        const p = input.params as {
          chance?: Record<string, number>;
          slots?: Record<string, number>;
        };
        if (p.chance) {
          const v = validateChanceSum(
            Object.entries(p.chance).map(([id, chance]) => ({ id, chance })),
          );
          if (!v.ok)
            throw new TRPCError({ code: "BAD_REQUEST", message: `${v.code}: ${v.message}` });
        } else if (p.slots) {
          const v = validateSlotBounds(
            Object.entries(p.slots).map(([id, slots]) => ({ id, slots })),
          );
          if (!v.ok)
            throw new TRPCError({ code: "BAD_REQUEST", message: `${v.code}: ${v.message}` });
        }
      }

      const scopeRefId = input.scopeRefId ?? null;
      const existing = await prisma.flowAlgorithmConfig.findFirst({
        where: { flowVersionId: latest.id, scope: input.scope, scopeRefId },
      });
      const row = existing
        ? await prisma.flowAlgorithmConfig.update({
            where: { id: existing.id },
            data: { mode: input.mode, params: input.params as object },
          })
        : await prisma.flowAlgorithmConfig.create({
            data: {
              flowVersionId: latest.id,
              scope: input.scope,
              scopeRefId,
              mode: input.mode,
              params: input.params as object,
            },
          });
      await writeAuditLog({
        userId: ctx.userId,
        action: "flow.updateAlgorithm",
        entity: "Flow",
        entityId: input.flowId,
      });
      return row;
    }),

  // Brokers with health + autologin info, scoped to what the broker-pool
  // node inspector needs. Separate from `broker.list` because it omits
  // secrets (fieldMapping, endpointUrl, etc.) entirely — OPERATOR role
  // can see this summary.
  listBrokersForFlow: protectedProcedure.query(async () => {
    const rows = await prisma.broker.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        dailyCap: true,
        lastHealthStatus: true,
        lastHealthCheckAt: true,
        autologinEnabled: true,
      },
    });
    return rows;
  }),

  // Overview: aggregated stats for /dashboard/routing. Covers the last
  // 24h by default: total leads received + per-state counts, plus the
  // top 5 cap-blocked events by scope.
  overview: protectedProcedure.query(async () => {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [flows, leadsByState, capBlocked, brokers] = await Promise.all([
      prisma.flow.findMany({
        where: { status: { in: ["PUBLISHED", "DRAFT"] } },
        orderBy: { updatedAt: "desc" },
        include: { activeVersion: { select: { id: true, versionNumber: true } } },
      }),
      prisma.lead.groupBy({
        by: ["state", "geo"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.leadEvent.groupBy({
        by: ["leadId"],
        where: { kind: "CAP_BLOCKED", createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.broker.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          lastHealthStatus: true,
          dailyCap: true,
        },
      }),
    ]);

    // Top 5 cap-blocked leads with their geos
    const topCapLeadIds = capBlocked.slice(0, 5).map((r) => r.leadId);
    const topCapLeads =
      topCapLeadIds.length > 0
        ? await prisma.lead.findMany({
            where: { id: { in: topCapLeadIds } },
            select: { id: true, geo: true, affiliateId: true, createdAt: true },
          })
        : [];

    const receivedByGeo = new Map<string, number>();
    const routedByGeo = new Map<string, number>();
    for (const r of leadsByState) {
      receivedByGeo.set(r.geo, (receivedByGeo.get(r.geo) ?? 0) + r._count._all);
      if (["ACCEPTED", "PUSHED", "FTD"].includes(r.state)) {
        routedByGeo.set(r.geo, (routedByGeo.get(r.geo) ?? 0) + r._count._all);
      }
    }

    const geoStats = Array.from(receivedByGeo.entries())
      .map(([geo, received]) => ({
        geo,
        received,
        routed: routedByGeo.get(geo) ?? 0,
      }))
      .sort((a, b) => b.received - a.received);

    const totalReceived = leadsByState.reduce((a, r) => a + r._count._all, 0);
    const totalRouted = leadsByState
      .filter((r) => ["ACCEPTED", "PUSHED", "FTD"].includes(r.state))
      .reduce((a, r) => a + r._count._all, 0);

    return {
      since: since.toISOString(),
      flows: flows.map((f) => ({
        id: f.id,
        name: f.name,
        status: f.status,
        timezone: f.timezone,
        activeVersionId: f.activeVersionId,
        activeVersionNumber: f.activeVersion?.versionNumber ?? null,
      })),
      geoStats,
      totals: {
        received: totalReceived,
        routed: totalRouted,
        hitRate: totalReceived > 0 ? totalRouted / totalReceived : 0,
      },
      topCapBlocked: capBlocked.slice(0, 5).map((r) => {
        const lead = topCapLeads.find((l) => l.id === r.leadId);
        return {
          leadId: r.leadId,
          geo: lead?.geo ?? "—",
          affiliateId: lead?.affiliateId ?? "—",
          events: r._count._all,
        };
      }),
      brokers: brokers.map((b) => ({
        id: b.id,
        name: b.name,
        isActive: b.isActive,
        lastHealthStatus: b.lastHealthStatus,
        dailyCap: b.dailyCap,
      })),
    };
  }),
});
