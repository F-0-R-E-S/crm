import { writeAuditLog } from "@/server/audit";
import { applyBrokerAuth } from "@/server/broker-adapter/auth";
import { pushToBroker } from "@/server/broker-adapter/push";
import { buildPayload } from "@/server/broker-adapter/template";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { z } from "zod";

const BrokerInput = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional(),
  dailyCap: z.number().int().positive().nullable().optional(),
  endpointUrl: z.string().url(),
  httpMethod: z.enum(["POST", "PUT"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  authType: z.enum(["NONE", "BEARER", "BASIC", "API_KEY_HEADER", "API_KEY_QUERY"]).optional(),
  authConfig: z.record(z.string(), z.unknown()).optional(),
  fieldMapping: z.record(z.string(), z.string()),
  staticPayload: z.record(z.string(), z.unknown()).optional(),
  responseIdPath: z.string().nullable().optional(),
  postbackSecret: z.string().min(1),
  postbackLeadIdPath: z.string().min(1),
  postbackStatusPath: z.string().min(1),
  statusMapping: z.record(z.string(), z.enum(["ACCEPTED", "DECLINED", "FTD"])).optional(),
});

export const brokerRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.broker.findMany({ orderBy: { createdAt: "desc" } }),
  ),
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => ctx.prisma.broker.findUniqueOrThrow({ where: { id: input.id } })),
  create: adminProcedure.input(BrokerInput).mutation(async ({ ctx, input }) => {
    const row = await ctx.prisma.broker.create({ data: input as never });
    await writeAuditLog({
      userId: ctx.userId,
      action: "broker.create",
      entity: "Broker",
      entityId: row.id,
    });
    return row;
  }),
  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(BrokerInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const before = await ctx.prisma.broker.findUniqueOrThrow({ where: { id } });
      const after = await ctx.prisma.broker.update({ where: { id }, data: patch as never });
      await writeAuditLog({
        userId: ctx.userId,
        action: "broker.update",
        entity: "Broker",
        entityId: id,
        diff: { before, after },
      });
      return after;
    }),
  testSend: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const b = await ctx.prisma.broker.findUniqueOrThrow({ where: { id: input.id } });
    const body = buildPayload(
      {
        firstName: "Test",
        lastName: "Lead",
        email: "test@example.com",
        phone: "+10000000000",
        geo: "XX",
      } as never,
      b.fieldMapping as Record<string, string>,
      b.staticPayload as Record<string, unknown>,
    );
    const authed = applyBrokerAuth(
      b.endpointUrl,
      b.headers as Record<string, string>,
      b.authType,
      b.authConfig as Record<string, unknown>,
    );
    const res = await pushToBroker({
      url: authed.url,
      method: b.httpMethod,
      headers: authed.headers,
      body,
      responseIdPath: b.responseIdPath,
      timeoutMs: 10_000,
      maxAttempts: 1,
    });
    return res;
  }),
});
