import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";

export interface ResolvePendingHoldPayload {
  leadId: string;
}

export async function handleResolvePendingHold(
  payload: ResolvePendingHoldPayload,
): Promise<void> {
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
}
