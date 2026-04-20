import type { Bot } from "grammy";
import { prisma } from "@/server/db";
import { consumeLinkToken } from "./link-token";
import { todayStats } from "./stats";

const MD = { parse_mode: "Markdown" as const };

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
    const sub = await prisma.telegramSubscription.findFirst({
      where: { chatId, isActive: true },
    });
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
}
