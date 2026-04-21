import { writeAuditLog } from "@/server/audit";
import { applyScheduledChange } from "@/server/scheduled-changes/orchestrator";
import { ALLOWED_FIELDS, validatePatch } from "@/server/scheduled-changes/patch";
import { adminProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const EntityType = z.enum(["Flow", "Broker", "Cap"]);
const Status = z.enum(["PENDING", "APPLIED", "CANCELLED", "FAILED"]);

export const scheduledChangeRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          status: Status.optional(),
          entityType: EntityType.optional(),
          fromApplyAt: z.date().optional(),
          toApplyAt: z.date().optional(),
          limit: z.number().int().min(1).max(500).default(100),
        })
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const where: Parameters<typeof ctx.prisma.scheduledChange.findMany>[0] extends
        | { where?: infer W }
        | undefined
        ? W
        : never = {};
      const filters: Record<string, unknown> = {};
      if (input.status) filters.status = input.status;
      if (input.entityType) filters.entityType = input.entityType;
      if (input.fromApplyAt || input.toApplyAt) {
        filters.applyAt = {
          ...(input.fromApplyAt ? { gte: input.fromApplyAt } : {}),
          ...(input.toApplyAt ? { lte: input.toApplyAt } : {}),
        };
      }
      return ctx.prisma.scheduledChange.findMany({
        where: filters as never,
        orderBy: [{ status: "asc" }, { applyAt: "asc" }],
        take: input.limit,
      });
    }),

  byId: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.scheduledChange.findUniqueOrThrow({ where: { id: input.id } });
  }),

  create: adminProcedure
    .input(
      z.object({
        entityType: EntityType,
        entityId: z.string().min(1),
        payload: z.record(z.string(), z.unknown()),
        applyAt: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate patch against allowlist upfront so operator gets instant feedback.
      try {
        validatePatch(input.entityType, input.payload);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "invalid_patch",
        });
      }
      const row = await ctx.prisma.scheduledChange.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          payload: input.payload as never,
          applyAt: input.applyAt,
          createdBy: ctx.userId,
        },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "scheduled_change_created",
        entity: "ScheduledChange",
        entityId: row.id,
        diff: {
          entityType: input.entityType,
          entityId: input.entityId,
          payload: input.payload,
          applyAt: input.applyAt,
        },
      });
      return row;
    }),

  cancel: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const row = await ctx.prisma.scheduledChange.findUniqueOrThrow({ where: { id: input.id } });
    if (row.status !== "PENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `only PENDING can be cancelled (current: ${row.status})`,
      });
    }
    const updated = await ctx.prisma.scheduledChange.update({
      where: { id: input.id },
      data: { status: "CANCELLED" },
    });
    await writeAuditLog({
      userId: ctx.userId,
      action: "scheduled_change_cancelled",
      entity: "ScheduledChange",
      entityId: input.id,
    });
    return updated;
  }),

  applyNow: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const row = await ctx.prisma.scheduledChange.findUniqueOrThrow({ where: { id: input.id } });
    if (row.status !== "PENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `only PENDING can be applied now (current: ${row.status})`,
      });
    }
    // Ensure cron picks it up immediately — set applyAt = now and trigger orchestrator
    await ctx.prisma.scheduledChange.update({
      where: { id: input.id },
      data: { applyAt: new Date() },
    });
    const res = await applyScheduledChange(input.id, ctx.userId);
    return res;
  }),

  retry: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const row = await ctx.prisma.scheduledChange.findUniqueOrThrow({ where: { id: input.id } });
    if (row.status !== "FAILED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `only FAILED can be retried (current: ${row.status})`,
      });
    }
    const updated = await ctx.prisma.scheduledChange.update({
      where: { id: input.id },
      data: { status: "PENDING", errorMessage: null, applyAt: new Date() },
    });
    await writeAuditLog({
      userId: ctx.userId,
      action: "scheduled_change_retry",
      entity: "ScheduledChange",
      entityId: input.id,
    });
    return updated;
  }),

  allowedFields: adminProcedure.query(() => ALLOWED_FIELDS),
});
