import { prisma } from "@/server/db";
import { withTenant } from "@/server/db-tenant";
import { emitConversion } from "@/server/finance/emit-conversion";
import { JOB_NAMES, getBoss, startBossOnce } from "@/server/jobs/queue";
import { logger, runWithTrace } from "@/server/observability";
import { verifyHmac } from "@/server/postback/hmac";
import { UNMAPPED, classifyLeadStatus } from "@/server/status-groups/classify";
import type { ConversionKind, LeadState, Prisma } from "@prisma/client";
import { JSONPath } from "jsonpath-plus";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

function err(code: string, status: number, trace_id: string) {
  return NextResponse.json({ error: { code, trace_id } }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ brokerId: string }> }) {
  const { brokerId } = await params;
  const trace_id = nanoid();
  return runWithTrace(trace_id, async () => {
    const broker = await prisma.broker.findUnique({ where: { id: brokerId } });
    if (!broker) return err("broker_not_found", 404, trace_id);

    return withTenant(broker.tenantId, async () => {
      const rawBody = await req.text();
      const signature = req.headers.get("x-signature") ?? "";
      const verified = verifyHmac(broker.postbackSecret, rawBody, signature);

      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(rawBody);
      } catch {
        /* record raw below */
      }
      const payloadJson = payload as Prisma.InputJsonValue;
      const headersJson = Object.fromEntries(req.headers.entries()) as Prisma.InputJsonValue;

      if (!verified) {
        await prisma.postbackReceipt.create({
          data: {
            brokerId,
            payload: payloadJson,
            headers: headersJson,
            verified: false,
            traceId: trace_id,
          },
        });
        return err("invalid_signature", 401, trace_id);
      }

      // jsonpath-plus v10 types omit preventEval, but runtime honors it (security hardening).
      // biome-ignore lint/suspicious/noExplicitAny: JSONPath v10 types lack preventEval option
      const jp = JSONPath as any;
      const extMatches = jp({
        path: broker.postbackLeadIdPath,
        json: payload,
        preventEval: true,
      }) as unknown[];
      const statusMatches = jp({
        path: broker.postbackStatusPath,
        json: payload,
        preventEval: true,
      }) as unknown[];
      const extId = extMatches[0];
      const rawStatus = statusMatches[0];
      if (!extId) {
        await prisma.postbackReceipt.create({
          data: {
            brokerId,
            payload: payloadJson,
            headers: headersJson,
            verified: true,
            traceId: trace_id,
          },
        });
        return err("lead_id_missing", 400, trace_id);
      }

      const lead = await prisma.lead.findFirst({
        where: { brokerId, brokerExternalId: String(extId) },
      });
      if (!lead) {
        await prisma.postbackReceipt.create({
          data: {
            brokerId,
            payload: payloadJson,
            headers: headersJson,
            verified: true,
            leadId: null,
            traceId: trace_id,
          },
        });
        return err("lead_not_found", 404, trace_id);
      }

      const mapping = (broker.statusMapping ?? {}) as Record<string, string>;
      const rawMapped = mapping[String(rawStatus)];
      // Map a mapping value that names a ConversionKind (not a LeadState) into
      // an equivalent LeadState so the existing state-machine stays in sync,
      // and remember the conversion kind to emit.
      let target: LeadState | undefined;
      let conversionKind: ConversionKind | null = null;
      if (rawMapped === "REGISTRATION") {
        target = "ACCEPTED";
        conversionKind = "REGISTRATION";
      } else if (rawMapped === "REDEPOSIT") {
        target = "FTD";
        conversionKind = "REDEPOSIT";
      } else if (rawMapped === "FTD") {
        target = "FTD";
        conversionKind = "FTD";
      } else if (rawMapped) {
        target = rawMapped as LeadState;
        if (rawMapped === "ACCEPTED") conversionKind = "REGISTRATION";
      }
      const resolved: LeadState = target ?? "DECLINED";

      const wasInHold = lead.state === "PENDING_HOLD";
      const shaveDetected = wasInHold && resolved === "DECLINED";
      const holdReleased =
        wasInHold && (resolved === "ACCEPTED" || resolved === "FTD" || resolved === "DECLINED");

      const leadDataExtras: Prisma.LeadUpdateInput = {};
      if (holdReleased) leadDataExtras.pendingHoldUntil = null;
      if (shaveDetected) leadDataExtras.shaveSuspected = true;

      const extraEvents: Prisma.LeadEventCreateManyInput[] = [];
      if (shaveDetected) {
        extraEvents.push({
          leadId: lead.id,
          kind: "SHAVE_SUSPECTED",
          meta: {
            brokerId: broker.id,
            holdStarted: lead.lastPushAt?.toISOString() ?? null,
            declinedAt: new Date().toISOString(),
          },
        });
      } else if (holdReleased) {
        extraEvents.push({
          leadId: lead.id,
          kind: "PENDING_HOLD_RELEASED",
          meta: { reason: "postback_accept" },
        });
      }

      // Resolve canonical status via StatusMapping (EPIC-18). `unmapped` is a
      // valid sentinel — seen-but-unclassified raws. Operators normalize via
      // /dashboard/brokers/<id>/status-mapping.
      const canonicalCode = await classifyLeadStatus(brokerId, String(rawStatus ?? ""));
      const canonicalStatusValue = canonicalCode === UNMAPPED ? UNMAPPED : canonicalCode;

      await prisma.$transaction([
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            state: resolved,
            lastBrokerStatus: String(rawStatus ?? ""),
            canonicalStatus: canonicalStatusValue,
            ...(resolved === "FTD" ? { ftdAt: new Date() } : {}),
            ...(resolved === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
            ...leadDataExtras,
          },
        }),
        prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            kind: "POSTBACK_RECEIVED",
            meta: {
              rawStatus: rawStatus == null ? null : String(rawStatus),
              resolved,
              unmapped: !target,
            },
          },
        }),
        prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            kind: "STATE_TRANSITION",
            meta: { from: lead.state, to: resolved },
          },
        }),
        ...(extraEvents.length > 0 ? [prisma.leadEvent.createMany({ data: extraEvents })] : []),
        prisma.postbackReceipt.create({
          data: {
            brokerId,
            payload: payloadJson,
            headers: headersJson,
            verified: true,
            leadId: lead.id,
            traceId: trace_id,
          },
        }),
      ]);

      if (conversionKind) {
        const brokerReportedAt = new Date();
        const amount =
          (payload as Record<string, unknown>).amount ??
          (payload as Record<string, unknown>).deposit_amount ??
          (payload as Record<string, unknown>).ftd_amount ??
          0;
        const occurredAt =
          conversionKind === "FTD"
            ? (lead.ftdAt ?? brokerReportedAt)
            : conversionKind === "REGISTRATION"
              ? (lead.acceptedAt ?? brokerReportedAt)
              : brokerReportedAt;
        try {
          await emitConversion({
            leadId: lead.id,
            kind: conversionKind,
            amount: amount as string | number,
            occurredAt,
            brokerReportedAt,
          });
        } catch (err) {
          logger.warn(
            { event: "emit_conversion_failed", lead_id: lead.id, err: String(err) },
            "postback",
          );
        }
      }

      if (resolved === "ACCEPTED" || resolved === "DECLINED" || resolved === "FTD") {
        await startBossOnce();
        const boss = getBoss();
        await boss.send(JOB_NAMES.notifyAffiliate, {
          leadId: lead.id,
          event: resolved.toLowerCase(),
        });
      }

      logger.info(
        { event: "postback_processed", lead_id: lead.id, from: lead.state, to: resolved },
        "postback",
      );
      return NextResponse.json({ ok: true, trace_id }, { status: 200 });
    }); // withTenant
  });
}
