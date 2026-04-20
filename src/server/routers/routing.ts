import { writeAuditLog } from "@/server/audit";
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
});
