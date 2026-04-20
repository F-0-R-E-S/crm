import { Bot } from "grammy";
import { prisma } from "@/server/db";
import { registerCommands } from "./commands";

interface CachedBot {
  token: string;
  bot: Bot;
}

const g = globalThis as unknown as { __telegramBotCache?: CachedBot };

export async function getBot(): Promise<Bot | null> {
  const cfg = await prisma.telegramBotConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!cfg) return null;

  if (g.__telegramBotCache && g.__telegramBotCache.token === cfg.botToken) {
    return g.__telegramBotCache.bot;
  }

  const bot = new Bot(cfg.botToken);
  registerCommands(bot);
  g.__telegramBotCache = { token: cfg.botToken, bot };
  return bot;
}

export async function getWebhookSecret(): Promise<string | null> {
  const cfg = await prisma.telegramBotConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { webhookSecret: true },
  });
  return cfg?.webhookSecret ?? null;
}

export function resetBotCache(): void {
  g.__telegramBotCache = undefined;
}
