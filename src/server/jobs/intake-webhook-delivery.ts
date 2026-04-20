import { prisma } from "@/server/db";
import { JOB_NAMES, startBossOnce } from "@/server/jobs/queue";
import { logger } from "@/server/observability";
import { parseRetrySchedule } from "@/server/webhooks/intake-outcome";
import type { Job } from "pg-boss";

export interface IntakeWebhookDeliveryJob {
  deliveryId: string;
  scheduleIndex: number;
}

export async function handleIntakeWebhookDelivery(job: Job<IntakeWebhookDeliveryJob>) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: job.data.deliveryId },
    include: { webhook: true },
  });
  if (!delivery || delivery.deliveredAt) return;
  if (!delivery.webhook.isActive) return;

  const body = JSON.stringify(delivery.payload);
  let httpStatus = 0;
  let errText: string | null = null;
  try {
    const res = await fetch(delivery.webhook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-signature": delivery.signature,
        "x-timestamp": new Date().toISOString(),
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    httpStatus = res.status;
    if (res.status === 410) {
      await prisma.affiliateIntakeWebhook.update({
        where: { id: delivery.webhookId },
        data: { isActive: false, pausedAt: new Date(), pausedReason: "http_410_gone" },
      });
      logger.warn(
        { event: "webhook_auto_paused", webhookId: delivery.webhookId, reason: "http_410_gone" },
        "webhook paused on 410",
      );
    }
  } catch (e) {
    errText = e instanceof Error ? e.message : "unknown";
  }

  const success = httpStatus >= 200 && httpStatus < 300;
  if (success) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { deliveredAt: new Date(), lastStatus: httpStatus, attempt: delivery.attempt + 1 },
    });
    return;
  }

  const schedule = parseRetrySchedule();
  const nextIndex = job.data.scheduleIndex + 1;
  if (nextIndex >= schedule.length) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { lastStatus: httpStatus, lastError: errText, attempt: delivery.attempt + 1 },
    });
    logger.warn(
      { event: "webhook_dlq", deliveryId: delivery.id, lastStatus: httpStatus },
      "delivery exhausted",
    );
    return;
  }

  const delaySec = schedule[nextIndex];
  const nextAttemptAt = new Date(Date.now() + delaySec * 1000);
  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      lastStatus: httpStatus,
      lastError: errText,
      attempt: delivery.attempt + 1,
      nextAttemptAt,
    },
  });

  const boss = await startBossOnce();
  await boss.send(
    JOB_NAMES.intakeWebhookDelivery,
    { deliveryId: delivery.id, scheduleIndex: nextIndex },
    { startAfter: delaySec },
  );
}
