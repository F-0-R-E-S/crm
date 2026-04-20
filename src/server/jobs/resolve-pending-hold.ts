import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { logger } from "@/server/observability";
import { emitTelegramEvent } from "@/server/telegram/emit";

export interface ResolvePendingHoldPayload {
  leadId: string;
}

export async function handleResolvePendingHold(payload: ResolvePendingHoldPayload): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
  if (!lead) return;
  if (lead.state !== "PENDING_HOLD") return;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      state: "ACCEPTED",
      acceptedAt: new Date(),
      pendingHoldUntil: null,
    },
  });
  await writeLeadEvent(lead.id, "PENDING_HOLD_RELEASED", {
    reason: "hold_window_expired",
  });
  const broker = lead.brokerId
    ? await prisma.broker.findUnique({
        where: { id: lead.brokerId },
        select: { name: true },
      })
    : null;
  void emitTelegramEvent(
    "PENDING_HOLD_RELEASED",
    { leadId: lead.id, newBrokerName: broker?.name ?? null },
    { brokerId: lead.brokerId ?? undefined, affiliateId: lead.affiliateId },
  ).catch((e) =>
    logger.warn({ err: (e as Error).message }, "[telegram-emit] PENDING_HOLD_RELEASED failed"),
  );
}
