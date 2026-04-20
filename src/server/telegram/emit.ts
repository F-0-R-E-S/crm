import { prisma } from "@/server/db";
import { JOB_NAMES, getBoss, startBossOnce } from "@/server/jobs/queue";
import type { TelegramEventType } from "./event-catalog";

export type EmitFilters = { brokerId?: string; affiliateId?: string };

export async function emitTelegramEvent(
  type: TelegramEventType,
  payload: Record<string, unknown>,
  filters: EmitFilters = {},
): Promise<number> {
  const subs = await prisma.telegramSubscription.findMany({
    where: { isActive: true },
  });
  const matching = subs.filter((s) => {
    if (s.eventTypes.length && !s.eventTypes.includes(type)) return false;
    if (
      filters.brokerId &&
      s.brokerFilter.length &&
      !s.brokerFilter.includes(filters.brokerId)
    )
      return false;
    if (
      filters.affiliateId &&
      s.affiliateFilter.length &&
      !s.affiliateFilter.includes(filters.affiliateId)
    )
      return false;
    if (filters.brokerId && s.mutedBrokerIds.includes(filters.brokerId)) return false;
    return true;
  });
  if (matching.length === 0) return 0;
  await startBossOnce();
  const boss = getBoss();
  for (const sub of matching) {
    await boss.send(JOB_NAMES.telegramSend, {
      chatId: sub.chatId,
      eventType: type,
      payload,
    });
  }
  return matching.length;
}
