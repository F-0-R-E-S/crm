import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import { JOB_NAMES, startBossOnce } from "@/server/jobs/queue";
import { nanoid } from "nanoid";

export type IntakeEventType = "intake.accepted" | "intake.rejected" | "intake.duplicate";

export interface IntakeEventPayload {
  event: IntakeEventType;
  event_id: string;
  emitted_at: string;
  data: {
    lead_id: string;
    affiliate_id: string;
    trace_id: string;
    reject_reason?: string | null;
    matched_by?: string | null;
    existing_lead_id?: string | null;
  };
}

export function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export function buildIntakeEvent(
  event: IntakeEventType,
  args: {
    leadId: string;
    affiliateId: string;
    traceId: string;
    rejectReason?: string | null;
    matchedBy?: string | null;
    existingLeadId?: string | null;
  },
): IntakeEventPayload {
  return {
    event,
    event_id: nanoid(),
    emitted_at: new Date().toISOString(),
    data: {
      lead_id: args.leadId,
      affiliate_id: args.affiliateId,
      trace_id: args.traceId,
      reject_reason: args.rejectReason ?? null,
      matched_by: args.matchedBy ?? null,
      existing_lead_id: args.existingLeadId ?? null,
    },
  };
}

export function parseRetrySchedule(): number[] {
  return env.WEBHOOK_RETRY_SCHEDULE_SEC.split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export async function dispatchIntakeEvent(
  affiliateId: string,
  event: IntakeEventPayload,
): Promise<number> {
  const hooks = await prisma.affiliateIntakeWebhook.findMany({
    where: { affiliateId, isActive: true, events: { has: event.event } },
  });
  if (hooks.length === 0) return 0;

  const body = JSON.stringify(event);
  const boss = await startBossOnce();
  for (const hook of hooks) {
    const signature = signPayload(hook.secret, body);
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: hook.id,
        eventType: event.event,
        payload: event as unknown as object,
        signature,
        attempt: 0,
      },
    });
    await boss.send(JOB_NAMES.intakeWebhookDelivery, {
      deliveryId: delivery.id,
      scheduleIndex: 0,
    });
  }
  return hooks.length;
}
