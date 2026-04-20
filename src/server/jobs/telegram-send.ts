import { prisma } from "@/server/db";
import { getBot } from "@/server/telegram/bot";
import type { TelegramEventType } from "@/server/telegram/event-catalog";
import { TEMPLATES, fallbackRender } from "@/server/telegram/templates";
import type { Prisma } from "@prisma/client";
import { JOB_NAMES, getBoss, startBossOnce } from "./queue";

export interface TelegramSendPayload {
  chatId: string;
  eventType: TelegramEventType;
  payload: Record<string, unknown>;
}

const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return 1000 * 2 ** attempt;
}

export async function handleTelegramSend(job: TelegramSendPayload): Promise<void> {
  const render = TEMPLATES[job.eventType] ?? fallbackRender;
  const text = render(job.payload).slice(0, 4096);
  const bot = await getBot();
  if (!bot) {
    await prisma.telegramEventLog.create({
      data: {
        chatId: job.chatId,
        eventType: job.eventType,
        payload: job.payload as Prisma.InputJsonValue,
        messageText: text,
        successful: false,
        errorMessage: "bot_not_configured",
      },
    });
    return;
  }

  let lastError: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await bot.api.sendMessage(job.chatId, text, {
        parse_mode: "Markdown",
      });
      await prisma.telegramEventLog.create({
        data: {
          chatId: job.chatId,
          eventType: job.eventType,
          payload: job.payload as Prisma.InputJsonValue,
          messageText: text,
          sentAt: new Date(),
          successful: true,
          telegramMsgId: res.message_id,
        },
      });
      return;
    } catch (e) {
      const err = e as {
        error_code?: number;
        description?: string;
        parameters?: { retry_after?: number };
        message?: string;
      };
      lastError = err.description ?? err.message ?? String(e);
      if (err.error_code === 429 && err.parameters?.retry_after) {
        await sleep(err.parameters.retry_after * 1000);
        continue;
      }
      await sleep(backoffMs(attempt));
    }
  }

  await prisma.telegramEventLog.create({
    data: {
      chatId: job.chatId,
      eventType: job.eventType,
      payload: job.payload as Prisma.InputJsonValue,
      messageText: text,
      successful: false,
      errorMessage: lastError ?? "send_failed",
    },
  });
  throw new Error(`telegram send failed: ${lastError}`);
}

export async function registerTelegramSendWorker() {
  await startBossOnce();
  const boss = getBoss();
  await boss.work<TelegramSendPayload>(JOB_NAMES.telegramSend, async ([job]) => {
    await handleTelegramSend(job.data);
  });
}
