import { prisma } from "@/server/db";
import type { Bot } from "grammy";
import { TELEGRAM_EVENT_TYPES, isTelegramEventType } from "./event-catalog";
import { consumeLinkToken } from "./link-token";
import { todayStats } from "./stats";

const MD = { parse_mode: "Markdown" as const };

async function activeSub(chatId: string) {
  return prisma.telegramSubscription.findFirst({
    where: { chatId, isActive: true },
    include: { user: true },
  });
}

async function requireAdmin(chatId: string): Promise<{ userId: string; subId: string } | null> {
  const sub = await activeSub(chatId);
  if (!sub || sub.user?.role !== "ADMIN") return null;
  return { userId: sub.userId, subId: sub.id };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function registerCommands(bot: Bot) {
  bot.command("ping", (ctx) => ctx.reply("pong"));

  bot.command("start", async (ctx) => {
    const token = (ctx.match ?? "").trim();
    const chatId = String(ctx.chat?.id ?? "");
    const tgUserId = String(ctx.from?.id ?? "");
    if (!token) {
      await ctx.reply(
        "Welcome. To link this chat, issue a token from the CRM *Settings → Telegram* page and run `/start <token>`.",
        MD,
      );
      return;
    }
    const res = await consumeLinkToken(token, chatId, tgUserId);
    if (res.ok) {
      await ctx.reply("Linked. This chat now receives alerts based on your subscription.", MD);
    } else if (res.reason === "token_expired") {
      await ctx.reply("That token has expired. Please issue a new one from the CRM.", MD);
    } else {
      await ctx.reply("Invalid token. Please issue a new one from the CRM.", MD);
    }
  });

  bot.command("stats", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const sub = await activeSub(chatId);
    if (!sub) {
      await ctx.reply("Not linked. Run `/start <token>` first.", MD);
      return;
    }
    const s = await todayStats({
      affiliateIds: sub.affiliateFilter,
      brokerIds: sub.brokerFilter,
    });
    const body = [
      "*Today's counters*",
      `Intake: ${s.intake}`,
      `Pushed: ${s.pushed}`,
      `Accepted: ${s.accepted}`,
      `Declined: ${s.declined}`,
      `FTD: ${s.ftd}`,
      `Rejected: ${s.rejected}`,
    ].join("\n");
    await ctx.reply(body, MD);
  });

  bot.command("sub", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const sub = await activeSub(chatId);
    if (!sub) {
      await ctx.reply("Not linked. Run `/start <token>` first.", MD);
      return;
    }
    const val = (ctx.match ?? "").trim().toUpperCase();
    if (!val || !isTelegramEventType(val)) {
      await ctx.reply(`Invalid event type. Valid types:\n${TELEGRAM_EVENT_TYPES.join(", ")}`, MD);
      return;
    }
    const next = uniq([...sub.eventTypes, val]);
    await prisma.telegramSubscription.update({
      where: { id: sub.id },
      data: { eventTypes: next },
    });
    await ctx.reply(`Subscribed to *${val}*.`, MD);
  });

  bot.command("unsub", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const sub = await activeSub(chatId);
    if (!sub) {
      await ctx.reply("Not linked. Run `/start <token>` first.", MD);
      return;
    }
    const val = (ctx.match ?? "").trim().toUpperCase();
    if (!val || !isTelegramEventType(val)) {
      await ctx.reply(`Invalid event type. Valid types:\n${TELEGRAM_EVENT_TYPES.join(", ")}`, MD);
      return;
    }
    const next = sub.eventTypes.filter((e) => e !== val);
    await prisma.telegramSubscription.update({
      where: { id: sub.id },
      data: { eventTypes: next },
    });
    await ctx.reply(`Unsubscribed from *${val}*.`, MD);
  });

  bot.command("mutebroker", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const sub = await activeSub(chatId);
    if (!sub) {
      await ctx.reply("Not linked. Run `/start <token>` first.", MD);
      return;
    }
    const id = (ctx.match ?? "").trim();
    if (!id) {
      await ctx.reply("Usage: `/mutebroker <brokerId>`", MD);
      return;
    }
    const broker = await prisma.broker.findUnique({ where: { id } });
    if (!broker) {
      await ctx.reply(`Broker \`${id}\` not found.`, MD);
      return;
    }
    const next = uniq([...sub.mutedBrokerIds, id]);
    await prisma.telegramSubscription.update({
      where: { id: sub.id },
      data: { mutedBrokerIds: next },
    });
    await ctx.reply(`Muted broker *${broker.name}*.`, MD);
  });

  bot.command("ack", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const admin = await requireAdmin(chatId);
    if (!admin) {
      await ctx.reply("This command requires an ADMIN-role linked account.", MD);
      return;
    }
    const leadId = (ctx.match ?? "").trim();
    if (!leadId) {
      await ctx.reply("Usage: `/ack <leadId>`", MD);
      return;
    }
    await prisma.leadEvent.create({
      data: {
        leadId,
        kind: "MANUAL_OVERRIDE",
        meta: { action: "fraud_hit_ack", by: "telegram", userId: admin.userId },
      },
    });
    await ctx.reply(`Acknowledged fraud hit for lead \`${leadId}\`.`, MD);
  });

  bot.command("pause_broker", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const admin = await requireAdmin(chatId);
    if (!admin) {
      await ctx.reply("This command requires an ADMIN-role linked account.", MD);
      return;
    }
    const id = (ctx.match ?? "").trim();
    if (!id) {
      await ctx.reply("Usage: `/pause_broker <id>`", MD);
      return;
    }
    const broker = await prisma.broker.findUnique({ where: { id } });
    if (!broker) {
      await ctx.reply(`Broker \`${id}\` not found.`, MD);
      return;
    }
    await prisma.broker.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: {
        action: "broker.pause",
        entity: "Broker",
        entityId: id,
        diff: { via: "telegram" },
        userId: admin.userId,
      },
    });
    await ctx.reply(`Paused broker *${broker.name}*.`, MD);
  });

  bot.command("resume_broker", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const admin = await requireAdmin(chatId);
    if (!admin) {
      await ctx.reply("This command requires an ADMIN-role linked account.", MD);
      return;
    }
    const id = (ctx.match ?? "").trim();
    if (!id) {
      await ctx.reply("Usage: `/resume_broker <id>`", MD);
      return;
    }
    const broker = await prisma.broker.findUnique({ where: { id } });
    if (!broker) {
      await ctx.reply(`Broker \`${id}\` not found.`, MD);
      return;
    }
    await prisma.broker.update({ where: { id }, data: { isActive: true } });
    await prisma.auditLog.create({
      data: {
        action: "broker.resume",
        entity: "Broker",
        entityId: id,
        diff: { via: "telegram" },
        userId: admin.userId,
      },
    });
    await ctx.reply(`Resumed broker *${broker.name}*.`, MD);
  });
}
