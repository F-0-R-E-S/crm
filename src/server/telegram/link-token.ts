import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { prisma } from "@/server/db";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function issueLinkToken(userId: string): Promise<string> {
  const raw = randomBytes(24).toString("base64url");
  const hash = sha256(raw);
  const expires = new Date(Date.now() + env.TELEGRAM_LINK_TOKEN_TTL_MIN * 60 * 1000);
  const pendingChatId = `pending:${hash}`;

  await prisma.telegramSubscription.upsert({
    where: { userId_chatId: { userId, chatId: pendingChatId } },
    create: {
      userId,
      chatId: pendingChatId,
      isActive: false,
      linkTokenHash: hash,
      linkTokenExpires: expires,
    },
    update: {
      linkTokenHash: hash,
      linkTokenExpires: expires,
      isActive: false,
    },
  });
  return raw;
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "token_not_found" | "token_expired" };

export async function consumeLinkToken(
  raw: string,
  chatId: string,
  telegramUserId: string,
): Promise<ConsumeResult> {
  const hash = sha256(raw);
  const pending = await prisma.telegramSubscription.findFirst({
    where: { linkTokenHash: hash },
  });
  if (!pending) return { ok: false, reason: "token_not_found" };
  if (!pending.linkTokenExpires || pending.linkTokenExpires < new Date()) {
    return { ok: false, reason: "token_expired" };
  }
  const userId = pending.userId;

  await prisma.$transaction(async (tx) => {
    await tx.telegramSubscription.delete({ where: { id: pending.id } });
    await tx.telegramSubscription.upsert({
      where: { userId_chatId: { userId, chatId } },
      create: {
        userId,
        chatId,
        telegramUserId,
        isActive: true,
        linkTokenHash: null,
        linkTokenExpires: null,
      },
      update: {
        telegramUserId,
        isActive: true,
        linkTokenHash: null,
        linkTokenExpires: null,
      },
    });
  });
  return { ok: true, userId };
}
