import { emitAlert } from "@/server/alerts/emitter";
import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import type { ManualReviewReason } from "@prisma/client";

export interface EnqueueManualReviewInput {
  leadId: string;
  reason: ManualReviewReason;
  lastBrokerId?: string | null;
  lastError?: string | null;
}

export async function enqueueManualReview(input: EnqueueManualReviewInput): Promise<void> {
  await prisma.manualReviewQueue.upsert({
    where: { leadId: input.leadId },
    update: {
      reason: input.reason,
      lastBrokerId: input.lastBrokerId ?? null,
      lastError: input.lastError ?? null,
      claimedBy: null,
      claimedAt: null,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      resolutionNote: null,
    },
    create: {
      leadId: input.leadId,
      reason: input.reason,
      lastBrokerId: input.lastBrokerId ?? null,
      lastError: input.lastError ?? null,
    },
  });

  await writeLeadEvent(input.leadId, "MANUAL_REVIEW_ENQUEUED", {
    reason: input.reason,
    lastBrokerId: input.lastBrokerId ?? null,
    lastError: input.lastError ?? null,
  });

  await emitAlert("manual_queue_enqueued", {
    leadId: input.leadId,
    reason: input.reason,
    lastBrokerId: input.lastBrokerId ?? null,
  });
}

export async function getManualQueueDepth(): Promise<number> {
  return prisma.manualReviewQueue.count({ where: { resolvedAt: null } });
}
