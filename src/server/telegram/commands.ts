import type { Bot } from "grammy";

export function registerCommands(bot: Bot) {
  bot.command("ping", (ctx) => ctx.reply("pong"));
  // real commands registered in Tasks 3–5
}
