import { checkVoip } from "@/server/antifraud/voip";
import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { logger } from "@/server/observability";
import { redis } from "@/server/redis";

export interface VoipCheckPayload {
  leadId: string;
}

const CACHE_DAYS = Number(process.env.ANTIFRAUD_VOIP_CACHE_DAYS ?? "30");

export async function handleVoipCheck(payload: VoipCheckPayload): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
  if (!lead || !lead.phone || !lead.phoneHash) return;
  if (!["NEW", "PUSHING"].includes(lead.state)) return;

  const cacheKey = `voip:${lead.phoneHash}`;
  let lineType = await redis.get(cacheKey);
  if (!lineType) {
    const r = await checkVoip(lead.phone);
    if (r.error) {
      logger.warn({ event: "voip_check_error", lead_id: lead.id, error: r.error }, "voip skip");
      return;
    }
    lineType = r.lineType;
    if (lineType) await redis.set(cacheKey, lineType, "EX", CACHE_DAYS * 24 * 3600);
  }

  if (lineType && ["voip", "nonFixedVoip"].includes(lineType)) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { state: "REJECTED", rejectReason: "voip_detected" },
    });
    await writeLeadEvent(lead.id, "REJECTED_ANTIFRAUD", { stage: "voip_async", lineType });
  }
}
