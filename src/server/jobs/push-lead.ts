import { applyBrokerAuth } from "@/server/broker-adapter/auth";
import { type PushResult, pushToBroker } from "@/server/broker-adapter/push";
import { buildPayload } from "@/server/broker-adapter/template";
import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { logger } from "@/server/observability";
import { decrementCap, incrementCap, todayUtc } from "@/server/routing/caps";
import { type WorkingHours, isWithinWorkingHours } from "@/server/routing/filters";
import { enqueueManualReview } from "@/server/routing/manual-queue";
import { nthRetryDelay, parseRetrySchedule } from "@/server/routing/retry-schedule";
import { selectBrokerPool } from "@/server/routing/select-broker";
import { emitTelegramEvent } from "@/server/telegram/emit";
import type { Broker, Lead } from "@prisma/client";
import type { AutologinAttemptPayload } from "./autologin-attempt";
import { JOB_NAMES, getBoss, startBossOnce } from "./queue";

export interface PushLeadPayload {
  leadId: string;
  traceId: string;
  attemptN?: number;
}

// Per-broker push budget. Total worst case per pool ≈ brokers × (timeoutMs × maxAttempts + backoff).
const PUSH_TIMEOUT_MS = 5_000;
const PUSH_MAX_ATTEMPTS = 2;
const PUSH_BACKOFF_MS = [500];

type TriedEntry = {
  id: string;
  reason: "outside_hours" | "cap_full" | "push_failed";
  httpStatus?: number;
  error?: string;
};

export async function handlePushLead(payload: PushLeadPayload): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
  if (!lead || lead.state !== "NEW") return;

  await prisma.lead.update({ where: { id: lead.id }, data: { state: "PUSHING" } });

  const pool = await selectBrokerPool(lead.geo);
  const tried: TriedEntry[] = [];
  let winner: Broker | null = null;
  let winnerResult: PushResult | null = null;

  for (const broker of pool) {
    // --- pre-push filters --------------------------------------------------
    if (!isWithinWorkingHours(broker.workingHours as WorkingHours | null)) {
      tried.push({ id: broker.id, reason: "outside_hours" });
      await writeLeadEvent(lead.id, "CAP_BLOCKED", {
        brokerId: broker.id,
        reason: "outside_hours",
      });
      continue;
    }
    if (broker.dailyCap != null) {
      const count = await incrementCap("BROKER", broker.id, todayUtc());
      if (count > broker.dailyCap) {
        await decrementCap("BROKER", broker.id, todayUtc());
        tried.push({ id: broker.id, reason: "cap_full" });
        await writeLeadEvent(lead.id, "CAP_BLOCKED", {
          brokerId: broker.id,
          dailyCap: broker.dailyCap,
          count,
        });
        continue;
      }
    }

    // --- push attempt ------------------------------------------------------
    const body = buildPayload(
      lead as Lead,
      broker.fieldMapping as Record<string, string>,
      broker.staticPayload as Record<string, unknown>,
    );
    const authed = applyBrokerAuth(
      broker.endpointUrl,
      broker.headers as Record<string, string>,
      broker.authType,
      broker.authConfig as Record<string, unknown>,
    );

    await writeLeadEvent(lead.id, "BROKER_PUSH_ATTEMPT", {
      brokerId: broker.id,
      fallbackIndex: tried.length,
    });

    const _pushStart = Date.now();
    const result = await pushToBroker({
      url: authed.url,
      method: broker.httpMethod,
      headers: authed.headers,
      body,
      responseIdPath: broker.responseIdPath,
      timeoutMs: PUSH_TIMEOUT_MS,
      maxAttempts: PUSH_MAX_ATTEMPTS,
      backoffMs: PUSH_BACKOFF_MS,
    });
    logger.info({
      event: "broker.push",
      broker_id: broker.id,
      lead_id: lead.id,
      outcome: result.success ? "success" : "failure",
      latency_ms: Date.now() - _pushStart,
      attempt: tried.length + 1,
      http_status: result.httpStatus ?? null,
    });

    if (result.success) {
      winner = broker;
      winnerResult = result;
      break;
    }

    // push failed → return the cap slot we took, record and move on.
    if (broker.dailyCap != null) await decrementCap("BROKER", broker.id, todayUtc());
    tried.push({
      id: broker.id,
      reason: "push_failed",
      httpStatus: result.httpStatus,
      error: result.error,
    });
    await writeLeadEvent(lead.id, "BROKER_PUSH_FAIL", {
      brokerId: broker.id,
      httpStatus: result.httpStatus,
      error: result.error,
      attemptN: result.attemptN,
    });
  }

  // --- outcome --------------------------------------------------------------
  if (!winner || !winnerResult) {
    // Consult the last-failed broker's retry schedule; if a slot remains, re-enqueue.
    const lastPushFailed = [...tried].reverse().find((t) => t.reason === "push_failed");
    if (lastPushFailed) {
      const brokerForRetry = pool.find((b) => b.id === lastPushFailed.id);
      if (brokerForRetry) {
        const schedule = parseRetrySchedule(brokerForRetry.retrySchedule);
        const attemptIndex = payload.attemptN ?? 0;
        const delaySec = nthRetryDelay(schedule, attemptIndex);
        if (delaySec != null) {
          await prisma.lead.update({ where: { id: lead.id }, data: { state: "NEW" } });
          await startBossOnce();
          const bossRetry = getBoss();
          await bossRetry.send(
            JOB_NAMES.pushLead,
            {
              leadId: lead.id,
              traceId: lead.traceId,
              attemptN: attemptIndex + 1,
            } satisfies PushLeadPayload,
            { startAfter: delaySec },
          );
          return;
        }
      }
    }

    // Classify cold-overflow reason for manual review.
    const anyCapFull = tried.length > 0 && tried.every((t) => t.reason === "cap_full");
    const anyPushFailed = tried.some((t) => t.reason === "push_failed");
    const nothingTried = tried.length === 0;
    const mrReason = nothingTried
      ? ("NO_BROKER_MATCH" as const)
      : anyCapFull
        ? ("CAP_REACHED" as const)
        : anyPushFailed
          ? ("BROKER_FAILED" as const)
          : ("NO_BROKER_MATCH" as const);
    const lastPushFail = [...tried].reverse().find((t) => t.reason === "push_failed");

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        state: "FAILED",
        rejectReason:
          pool.length === 0 || tried.every((t) => t.reason !== "push_failed")
            ? "no_broker_available"
            : "pool_exhausted",
      },
    });
    await writeLeadEvent(lead.id, "NO_BROKER_AVAILABLE", { tried, poolSize: pool.length });
    logger.warn(
      {
        event: "pool_exhausted",
        lead_id: lead.id,
        geo: lead.geo,
        poolSize: pool.length,
        tried,
      },
      "no broker available",
    );
    // Telegram: emit FAILED (with last error) or CAP_REACHED.
    if (lastPushFail) {
      void emitTelegramEvent(
        "FAILED",
        { leadId: lead.id, brokerId: lastPushFail.id, error: lastPushFail.error },
        { brokerId: lastPushFail.id, affiliateId: lead.affiliateId },
      ).catch((e) =>
        logger.warn({ err: (e as Error).message }, "[telegram-emit] FAILED failed"),
      );
    }
    if (mrReason === "CAP_REACHED") {
      const capBroker = tried.find((t) => t.reason === "cap_full");
      void emitTelegramEvent(
        "CAP_REACHED",
        {
          scope: "BROKER",
          scopeId: capBroker?.id ?? "?",
          scopeName: capBroker?.id ?? "?",
          window: "DAILY",
          leadId: lead.id,
        },
        { brokerId: capBroker?.id, affiliateId: lead.affiliateId },
      ).catch((e) =>
        logger.warn({ err: (e as Error).message }, "[telegram-emit] CAP_REACHED failed"),
      );
    }
    void emitTelegramEvent(
      "MANUAL_REVIEW_QUEUED",
      { leadId: lead.id, reason: mrReason },
      { affiliateId: lead.affiliateId },
    ).catch((e) =>
      logger.warn({ err: (e as Error).message }, "[telegram-emit] MANUAL_REVIEW_QUEUED failed"),
    );
    await enqueueManualReview({
      leadId: lead.id,
      reason: mrReason,
      lastBrokerId: lastPushFail?.id ?? null,
      lastError: lastPushFail?.error ?? null,
    });
    await startBossOnce();
    const boss = getBoss();
    await boss.send(JOB_NAMES.notifyAffiliate, { leadId: lead.id, event: "failed" });
    return;
  }

  const holdMin = winner.pendingHoldMinutes ?? null;
  const holdUntil = holdMin && holdMin > 0 ? new Date(Date.now() + holdMin * 60_000) : null;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      brokerId: winner.id,
      state: holdUntil ? "PENDING_HOLD" : "PUSHED",
      lastPushAt: new Date(),
      brokerExternalId: winnerResult.externalId ?? null,
      pendingHoldUntil: holdUntil,
    },
  });
  await writeLeadEvent(lead.id, "ROUTING_DECIDED", {
    brokerId: winner.id,
    poolSize: pool.length,
    tried,
  });
  await writeLeadEvent(lead.id, "BROKER_PUSH_SUCCESS", {
    brokerId: winner.id,
    httpStatus: winnerResult.httpStatus,
    durationMs: winnerResult.durationMs,
    attemptN: winnerResult.attemptN,
    externalId: winnerResult.externalId,
    fallbackIndex: tried.length,
  });
  void emitTelegramEvent(
    "PUSHED",
    {
      leadId: lead.id,
      brokerId: winner.id,
      brokerName: winner.name,
      latencyMs: winnerResult.durationMs,
    },
    { brokerId: winner.id, affiliateId: lead.affiliateId },
  ).catch((e) => logger.warn({ err: (e as Error).message }, "[telegram-emit] PUSHED failed"));
  await startBossOnce();
  const boss = getBoss();
  if (winner.autologinEnabled && winner.autologinLoginUrl) {
    const adapterId =
      (winner as unknown as { template?: { slug?: string } }).template?.slug ?? "mock";
    await boss.send(JOB_NAMES.autologinAttempt, {
      traceId: payload.traceId,
      leadId: lead.id,
      brokerId: winner.id,
      adapterId,
      loginUrl: winner.autologinLoginUrl,
      credentials: { username: lead.email ?? "", password: "" },
    } satisfies AutologinAttemptPayload);
    await writeLeadEvent(lead.id, "STATE_TRANSITION", {
      kind: "autologin_enqueued",
      brokerId: winner.id,
    });
  }
  if (holdUntil && holdMin) {
    await writeLeadEvent(lead.id, "PENDING_HOLD_STARTED", {
      brokerId: winner.id,
      holdMinutes: holdMin,
      until: holdUntil.toISOString(),
    });
    await boss.send(JOB_NAMES.resolvePendingHold, { leadId: lead.id }, { startAfter: holdUntil });
  }
  await boss.send(JOB_NAMES.notifyAffiliate, { leadId: lead.id, event: "lead_pushed" });
}
