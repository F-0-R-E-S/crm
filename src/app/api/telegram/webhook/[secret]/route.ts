import { getBot, getWebhookSecret } from "@/server/telegram/bot";
import { webhookCallback } from "grammy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ secret: string }> }) {
  const { secret } = await ctx.params;
  const expected = await getWebhookSecret();
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const bot = await getBot();
  if (!bot) return NextResponse.json({ error: "bot_not_configured" }, { status: 503 });
  try {
    return await webhookCallback(bot, "std/http")(req);
  } catch (_e) {
    // grammy may throw on fake tokens in tests — still return 200 so Telegram doesn't retry.
    return new NextResponse(null, { status: 200 });
  }
}
