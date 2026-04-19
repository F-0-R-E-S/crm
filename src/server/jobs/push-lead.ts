import type { Lead } from "@prisma/client";
import { prisma } from "@/server/db";
import { selectBrokerPool } from "@/server/routing/select-broker";
import { isWithinWorkingHours, type WorkingHours } from "@/server/routing/filters";
import { incrementCap, decrementCap, todayUtc } from "@/server/routing/caps";
import { buildPayload } from "@/server/broker-adapter/template";
import { applyBrokerAuth } from "@/server/broker-adapter/auth";
import { pushToBroker } from "@/server/broker-adapter/push";
import { logger } from "@/server/observability";
import { getBoss, JOB_NAMES, startBossOnce } from "./queue";

export interface PushLeadPayload {
  leadId: string;
  traceId: string;
}

export async function handlePushLead(payload: PushLeadPayload): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
  if (!lead || lead.state !== "NEW") return;

  await prisma.lead.update({ where: { id: lead.id }, data: { state: "VALIDATING" } });

  const pool = await selectBrokerPool(lead.geo);
  const tried: Array<{ id: string; reason: string }> = [];
  let winner: (typeof pool)[number] | null = null;

  for (const broker of pool) {
    if (!isWithinWorkingHours(broker.workingHours as WorkingHours | null)) {
      tried.push({ id: broker.id, reason: "outside_hours" });
      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          kind: "CAP_BLOCKED",
          meta: { brokerId: broker.id, reason: "outside_hours" },
        },
      });
      continue;
    }
    if (broker.dailyCap != null) {
      const count = await incrementCap("BROKER", broker.id, todayUtc());
      if (count > broker.dailyCap) {
        await decrementCap("BROKER", broker.id, todayUtc());
        tried.push({ id: broker.id, reason: "cap_full" });
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            kind: "CAP_BLOCKED",
            meta: { brokerId: broker.id, dailyCap: broker.dailyCap, count },
          },
        });
        continue;
      }
    }
    winner = broker;
    break;
  }

  if (!winner) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { state: "FAILED", rejectReason: "no_broker_available" },
    });
    await prisma.leadEvent.create({
      data: { leadId: lead.id, kind: "NO_BROKER_AVAILABLE", meta: { tried } },
    });
    logger.warn(
      { event: "no_broker_available", lead_id: lead.id, geo: lead.geo, tried },
      "no broker",
    );
    return;
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { brokerId: winner.id, state: "PUSHING" },
  });
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      kind: "ROUTING_DECIDED",
      meta: { brokerId: winner.id, poolSize: pool.length, tried },
    },
  });

  const payloadBody = buildPayload(
    lead as Lead,
    winner.fieldMapping as Record<string, string>,
    winner.staticPayload as Record<string, unknown>,
  );
  const authed = applyBrokerAuth(
    winner.endpointUrl,
    winner.headers as Record<string, string>,
    winner.authType,
    winner.authConfig as Record<string, unknown>,
  );

  await prisma.leadEvent.create({
    data: { leadId: lead.id, kind: "BROKER_PUSH_ATTEMPT", meta: { brokerId: winner.id } },
  });

  const result = await pushToBroker({
    url: authed.url,
    method: winner.httpMethod,
    headers: authed.headers,
    body: payloadBody,
    responseIdPath: winner.responseIdPath,
    timeoutMs: 10_000,
    maxAttempts: 3,
  });

  if (result.success) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        state: "PUSHED",
        lastPushAt: new Date(),
        brokerExternalId: result.externalId ?? null,
      },
    });
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        kind: "BROKER_PUSH_SUCCESS",
        meta: {
          httpStatus: result.httpStatus,
          durationMs: result.durationMs,
          attemptN: result.attemptN,
          externalId: result.externalId,
        },
      },
    });
    await startBossOnce();
    const boss = getBoss();
    await boss.send(JOB_NAMES.notifyAffiliate, { leadId: lead.id, event: "lead_pushed" });
  } else {
    if (winner.dailyCap != null) await decrementCap("BROKER", winner.id, todayUtc());
    await prisma.lead.update({
      where: { id: lead.id },
      data: { state: "FAILED", rejectReason: "broker_push_failed" },
    });
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        kind: "BROKER_PUSH_FAIL",
        meta: {
          httpStatus: result.httpStatus,
          error: result.error,
          attemptN: result.attemptN,
        },
      },
    });
    await startBossOnce();
    const boss = getBoss();
    await boss.send(JOB_NAMES.notifyAffiliate, { leadId: lead.id, event: "failed" });
  }
}
