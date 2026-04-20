import { writeAuditLog } from "@/server/audit";
import { getTemplateById, listTemplates } from "@/server/broker-template/catalog";
import { createBrokerFromTemplate } from "@/server/broker-template/from-template";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { z } from "zod";

export const brokerTemplateRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        vertical: z.string().optional(),
        protocol: z.string().optional(),
        country: z.string().length(2).optional(),
        status: z.string().optional(),
        q: z.string().max(64).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        sortBy: z.enum(["name", "createdAt"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      }),
    )
    .query(async ({ input }) => listTemplates(input)),
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const t = await getTemplateById(input.id);
      if (!t) throw new Error("template_not_found");
      return t;
    }),
  createBroker: adminProcedure
    .input(
      z.object({
        templateId: z.string(),
        name: z.string().min(1),
        endpointUrl: z.string().url(),
        authConfig: z.record(z.string(), z.unknown()).default({}),
        postbackSecret: z.string().min(16).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const broker = await createBrokerFromTemplate(input);
      await writeAuditLog({
        userId: ctx.userId,
        action: "broker.create_from_template",
        entity: "Broker",
        entityId: broker.id,
        diff: { templateId: input.templateId },
      });
      return broker;
    }),
});
