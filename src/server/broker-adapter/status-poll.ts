import { applyBrokerAuth } from "@/server/broker-adapter/auth";
import { prisma } from "@/server/db";
import type { LeadState } from "@prisma/client";

export function normalizeBrokerStatus(
  raw: string | number | null | undefined,
  mapping: Record<string, LeadState>,
): LeadState | null {
  if (raw == null) return null;
  const key = String(raw);
  return mapping[key] ?? null;
}

export interface PollResult {
  polled: number;
  updated: number;
  unmapped: number;
  httpStatus: number | null;
  errorClass: string | null;
}

export async function pollBrokerStatuses(brokerId: string): Promise<PollResult> {
  const broker = await prisma.broker.findUnique({ where: { id: brokerId } });
  if (!broker) throw new Error("broker_not_found");
  if (broker.syncMode !== "polling") {
    return {
      polled: 0,
      updated: 0,
      unmapped: 0,
      httpStatus: null,
      errorClass: "not_polling_mode",
    };
  }

  const openLeads = await prisma.lead.findMany({
    where: {
      brokerId,
      brokerExternalId: { not: null },
      state: { notIn: ["FTD", "DECLINED", "FAILED"] },
    },
    take: 500,
  });
  if (openLeads.length === 0)
    return { polled: 0, updated: 0, unmapped: 0, httpStatus: null, errorClass: null };

  const pollPath = broker.statusPollPath ?? "/status";
  const idsParam = broker.statusPollIdsParam ?? "ids";
  const base = new URL(broker.endpointUrl);
  const pollUrl = new URL(pollPath, base);
  pollUrl.searchParams.set(idsParam, openLeads.map((l) => l.brokerExternalId).join(","));

  const authed = applyBrokerAuth(
    pollUrl.toString(),
    (broker.headers as Record<string, string>) ?? {},
    broker.authType,
    broker.authConfig as Record<string, unknown>,
  );

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let httpStatus: number | null = null;
  try {
    const res = await fetch(authed.url, {
      method: "GET",
      headers: authed.headers,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    httpStatus = res.status;
    if (!res.ok)
      return {
        polled: openLeads.length,
        updated: 0,
        unmapped: 0,
        httpStatus,
        errorClass: `http_${res.status}`,
      };
    const body = (await res.json()) as Array<{ lead_id: string; status: string }>;
    const mapping = (broker.statusMapping ?? {}) as Record<string, LeadState>;

    let updated = 0;
    let unmapped = 0;

    for (const item of body) {
      const lead = openLeads.find((l) => l.brokerExternalId === item.lead_id);
      if (!lead) continue;
      const resolved = normalizeBrokerStatus(item.status, mapping);

      if (!resolved) {
        unmapped++;
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            kind: "POSTBACK_RECEIVED",
            meta: {
              rawStatus: item.status,
              resolved: null,
              unmapped: true,
              source: "poll",
            },
          },
        });
        continue;
      }

      if (lead.state === resolved) continue;

      await prisma.$transaction([
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            state: resolved,
            lastBrokerStatus: item.status,
            ...(resolved === "FTD" ? { ftdAt: new Date() } : {}),
            ...(resolved === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
          },
        }),
        prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            kind: "POSTBACK_RECEIVED",
            meta: { rawStatus: item.status, resolved, source: "poll" },
          },
        }),
        prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            kind: "STATE_TRANSITION",
            meta: { from: lead.state, to: resolved, source: "poll" },
          },
        }),
      ]);
      updated++;
    }

    await prisma.broker.update({
      where: { id: brokerId },
      data: { lastPolledAt: new Date() },
    });

    return { polled: openLeads.length, updated, unmapped, httpStatus, errorClass: null };
  } catch (e) {
    clearTimeout(timer);
    const errorClass = (e as Error).name === "AbortError" ? "timeout" : "network_error";
    return { polled: openLeads.length, updated: 0, unmapped: 0, httpStatus, errorClass };
  }
}
