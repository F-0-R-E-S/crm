import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { logger } from "@/server/observability";
import { signHmac } from "@/server/postback/hmac";
import { renderPostbackUrl } from "./render-postback-url";

export interface NotifyAffiliatePayload {
  leadId: string;
  event: string; // "lead_pushed" | "ftd" | "accepted" | "declined" | "failed"
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function handleNotifyAffiliate(payload: NotifyAffiliatePayload): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: payload.leadId },
    include: { affiliate: true },
  });
  if (!lead) return;
  const aff = lead.affiliate;
  if (!aff.postbackUrl || !aff.postbackEvents.includes(payload.event)) return;

  const url = renderPostbackUrl(aff.postbackUrl, {
    sub_id: lead.subId ?? "",
    status: payload.event,
    payout: "",
    lead_id: lead.id,
    event_ts: lead.eventTs.toISOString(),
    trace_id: lead.traceId,
    broker_id: lead.brokerId ?? "",
  });

  const headers: Record<string, string> = {};
  if (aff.postbackSecret) headers["X-Signature"] = signHmac(aff.postbackSecret, url);

  const backoffs = [1000, 2000, 4000];
  let lastErr = "";
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { method: "GET", headers, signal: ctrl.signal });
      clearTimeout(timer);
      lastStatus = res.status;
      if (res.status >= 200 && res.status < 300) {
        await prisma.outboundPostback.create({
          data: {
            leadId: lead.id,
            affiliateId: aff.id,
            event: payload.event,
            url,
            httpStatus: res.status,
            deliveredAt: new Date(),
            attemptN: attempt,
          },
        });
        await writeLeadEvent(lead.id, "OUTBOUND_POSTBACK_SENT", {
          event: payload.event,
          httpStatus: res.status,
          attemptN: attempt,
        });
        logger.info(
          {
            event: "outbound_postback_sent",
            lead_id: lead.id,
            pb_event: payload.event,
            status: res.status,
          },
          "outbound ok",
        );
        return;
      }
      if (res.status >= 400 && res.status < 500) {
        lastErr = `http ${res.status}`;
        break;
      }
      lastErr = `http ${res.status}`;
    } catch (e) {
      clearTimeout(timer);
      lastErr = (e as Error).message;
    }
    if (attempt < 3) await sleep(backoffs[attempt - 1]);
  }

  await prisma.outboundPostback.create({
    data: {
      leadId: lead.id,
      affiliateId: aff.id,
      event: payload.event,
      url,
      httpStatus: lastStatus,
      errorMessage: lastErr,
      attemptN: 3,
    },
  });
  await writeLeadEvent(lead.id, "OUTBOUND_POSTBACK_FAILED", {
    event: payload.event,
    error: lastErr,
  });
}
