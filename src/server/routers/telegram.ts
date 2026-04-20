import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import { resetBotCache } from "@/server/telegram/bot";
import {
  ADMIN_ONLY_EVENTS,
  TELEGRAM_EVENT_TYPES,
  type TelegramEventType,
} from "@/server/telegram/event-catalog";
import { issueLinkToken } from "@/server/telegram/link-token";
import { adminProcedure, protectedProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const eventTypeZ = z.enum(
  TELEGRAM_EVENT_TYPES as unknown as [TelegramEventType, ...TelegramEventType[]],
);

export const telegramRouter = router({
  // USER
  mySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    return prisma.telegramSubscription.findMany({
      where: { userId: ctx.userId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }),
  issueLinkToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = await issueLinkToken(ctx.userId);
    const cfg = await prisma.telegramBotConfig.findFirst({
      where: { isActive: true },
      select: { botUsername: true },
    });
    return {
      token,
      deepLink: cfg?.botUsername ? `https://t.me/${cfg.botUsername}?start=${token}` : null,
      ttlMin: env.TELEGRAM_LINK_TOKEN_TTL_MIN,
    };
  }),
  updateSubscription: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        eventTypes: z.array(eventTypeZ),
        brokerFilter: z.array(z.string()),
        affiliateFilter: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sub = await prisma.telegramSubscription.findUnique({ where: { id: input.id } });
      if (!sub || sub.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return prisma.telegramSubscription.update({
        where: { id: input.id },
        data: {
          eventTypes: input.eventTypes,
          brokerFilter: input.brokerFilter,
          affiliateFilter: input.affiliateFilter,
        },
      });
    }),
  catalog: protectedProcedure.query(async ({ ctx }) => {
    const [brokers, affiliates] = await Promise.all([
      prisma.broker.findMany({ select: { id: true, name: true } }),
      prisma.affiliate.findMany({ select: { id: true, name: true } }),
    ]);
    const types = (TELEGRAM_EVENT_TYPES as readonly TelegramEventType[]).filter(
      (t) => ctx.role === "ADMIN" || !ADMIN_ONLY_EVENTS.has(t),
    );
    return { brokers, affiliates, eventTypes: types };
  }),

  // ADMIN
  adminConfig: adminProcedure.query(async () => {
    const cfg = await prisma.telegramBotConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (!cfg) return null;
    const base = env.TELEGRAM_WEBHOOK_BASE_URL;
    return {
      id: cfg.id,
      botUsername: cfg.botUsername,
      webhookSecret: cfg.webhookSecret,
      hasToken: true,
      isActive: cfg.isActive,
      webhookUrl: base
        ? `${base.replace(/\/$/, "")}/api/telegram/webhook/${cfg.webhookSecret}`
        : null,
      createdAt: cfg.createdAt,
      updatedAt: cfg.updatedAt,
    };
  }),
  setBotToken: adminProcedure
    .input(
      z.object({
        botToken: z.string().min(10),
        botUsername: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.telegramBotConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        const updated = await prisma.telegramBotConfig.update({
          where: { id: existing.id },
          data: {
            botToken: input.botToken,
            botUsername: input.botUsername ?? existing.botUsername,
          },
        });
        resetBotCache();
        return { id: updated.id };
      }
      const created = await prisma.telegramBotConfig.create({
        data: {
          botToken: input.botToken,
          botUsername: input.botUsername,
          webhookSecret: randomBytes(24).toString("hex"),
        },
      });
      resetBotCache();
      return { id: created.id };
    }),
  rotateWebhookSecret: adminProcedure.mutation(async () => {
    const existing = await prisma.telegramBotConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    const updated = await prisma.telegramBotConfig.update({
      where: { id: existing.id },
      data: { webhookSecret: randomBytes(24).toString("hex") },
    });
    resetBotCache();
    return { webhookSecret: updated.webhookSecret };
  }),
  testSend: adminProcedure
    .input(z.object({ chatId: z.string(), text: z.string().min(1).max(4000) }))
    .mutation(async ({ input }) => {
      const { getBot } = await import("@/server/telegram/bot");
      const bot = await getBot();
      if (!bot) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "bot not configured" });
      const res = await bot.api.sendMessage(input.chatId, input.text, {
        parse_mode: "Markdown",
      });
      return { messageId: res.message_id };
    }),
  recentEvents: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const take = input?.limit ?? 50;
      return prisma.telegramEventLog.findMany({
        orderBy: { createdAt: "desc" },
        take,
      });
    }),
});
