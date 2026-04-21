import { writeAuditLog } from "@/server/audit";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { emitTelegramEvent } from "@/server/telegram/emit";
import type { ScheduledChange } from "@prisma/client";
import { type ALLOWED_FIELDS, SchedulePatchError, applyPatch, validatePatch } from "./patch";

type EntityType = keyof typeof ALLOWED_FIELDS;

function toEntityType(v: ScheduledChange["entityType"]): EntityType {
  return v as EntityType;
}

export interface ApplyResult {
  id: string;
  status: "APPLIED" | "FAILED" | "SKIPPED";
  latencyMs?: number;
  errorMessage?: string;
}

/**
 * Apply a single scheduled change by id. Called by the cron worker and by
 * `applyNow` manual trigger. Idempotent: no-op if the row isn't PENDING.
 */
export async function applyScheduledChange(id: string, appliedBy = "system"): Promise<ApplyResult> {
  const change = await prisma.scheduledChange.findUnique({ where: { id } });
  if (!change) return { id, status: "SKIPPED", errorMessage: "not_found" };
  if (change.status !== "PENDING") return { id, status: "SKIPPED", errorMessage: change.status };

  const entityType = toEntityType(change.entityType);
  const startedAt = Date.now();
  const latencyFromTarget = startedAt - change.applyAt.getTime();

  try {
    const patch = validatePatch(entityType, change.payload);
    const { before, after } = await prisma.$transaction(async (tx) => {
      return applyPatch({
        entityType,
        entityId: change.entityId,
        patch,
        ctx: { prisma: tx, appliedBy },
      });
    });
    const appliedAt = new Date();
    await prisma.scheduledChange.update({
      where: { id },
      data: {
        status: "APPLIED",
        appliedAt,
        appliedBy,
        latencyMs: latencyFromTarget,
        errorMessage: null,
      },
    });
    await writeAuditLog({
      userId: appliedBy,
      action: "scheduled_change_applied",
      entity: "ScheduledChange",
      entityId: id,
      diff: {
        entityType,
        entityId: change.entityId,
        patch,
        latencyMs: latencyFromTarget,
        before,
        after,
      },
    });
    logger.info(
      {
        event: "scheduled_change_applied",
        id,
        entity_type: entityType,
        entity_id: change.entityId,
        latency_ms: latencyFromTarget,
      },
      "scheduled change applied",
    );
    // Fire-and-forget telegram notify (ignore failures)
    void emitTelegramEvent("SCHEDULED_CHANGE_APPLIED", {
      id,
      entityType,
      entityId: change.entityId,
      patch,
      latencyMs: latencyFromTarget,
      appliedBy,
    }).catch((e) => logger.warn({ event: "telegram_emit_failed", err: String(e) }));
    return { id, status: "APPLIED", latencyMs: latencyFromTarget };
  } catch (err) {
    const errorMessage =
      err instanceof SchedulePatchError
        ? `[${err.code}] ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    await prisma.scheduledChange.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage,
        latencyMs: latencyFromTarget,
      },
    });
    await writeAuditLog({
      userId: appliedBy,
      action: "scheduled_change_failed",
      entity: "ScheduledChange",
      entityId: id,
      diff: { entityType, entityId: change.entityId, errorMessage },
    });
    logger.warn(
      {
        event: "scheduled_change_failed",
        id,
        entity_type: entityType,
        entity_id: change.entityId,
        error: errorMessage,
      },
      "scheduled change failed",
    );
    void emitTelegramEvent("SCHEDULED_CHANGE_FAILED", {
      id,
      entityType,
      entityId: change.entityId,
      errorMessage,
    }).catch(() => undefined);
    return { id, status: "FAILED", latencyMs: latencyFromTarget, errorMessage };
  }
}

/**
 * Scan PENDING rows where applyAt <= now() and apply each. Returns summary.
 */
export async function applyDueScheduledChanges(now: Date = new Date()): Promise<{
  processed: number;
  applied: number;
  failed: number;
  maxLatencyMs: number;
}> {
  const due = await prisma.scheduledChange.findMany({
    where: { status: "PENDING", applyAt: { lte: now } },
    orderBy: { applyAt: "asc" },
    take: 500,
  });
  let applied = 0;
  let failed = 0;
  let maxLatencyMs = 0;
  for (const row of due) {
    const res = await applyScheduledChange(row.id);
    if (res.status === "APPLIED") applied++;
    else if (res.status === "FAILED") failed++;
    if (res.latencyMs !== undefined && Math.abs(res.latencyMs) > maxLatencyMs) {
      maxLatencyMs = Math.abs(res.latencyMs);
    }
  }
  if (due.length > 0) {
    logger.info(
      {
        event: "scheduled_changes_batch",
        processed: due.length,
        applied,
        failed,
        max_latency_ms: maxLatencyMs,
      },
      "scheduled changes batch",
    );
  }
  return { processed: due.length, applied, failed, maxLatencyMs };
}
