import { createHash } from "node:crypto";
import { checkBlacklists } from "@/server/antifraud/blacklist";
import { isDuplicate } from "@/server/antifraud/dedup";
import { normalizePhone } from "@/server/antifraud/phone";
import { verifyApiKey } from "@/server/auth-api-key";
import { prisma } from "@/server/db";
import { logger, runWithTrace } from "@/server/observability";
import { checkRateLimit } from "@/server/ratelimit";
import { incrementCap, todayUtc } from "@/server/routing/caps";
import { IntakeSchema } from "@/server/zod/intake";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const DEDUP_DAYS = Number(process.env.ANTIFRAUD_DEDUP_WINDOW_DAYS ?? "7");

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function err(code: string, message: string, status: number, trace_id: string, field?: string) {
  return NextResponse.json({ error: { code, message, field, trace_id } }, { status });
}

export async function POST(req: Request) {
  const trace_id = nanoid();
  return runWithTrace(trace_id, async () => {
    const ctx = await verifyApiKey(req.headers.get("authorization"));
    if (!ctx) return err("unauthorized", "invalid api key", 401, trace_id);

    const idemKey = req.headers.get("x-idempotency-key");
    if (idemKey) {
      const cached = await prisma.idempotencyKey.findUnique({
        where: { affiliateId_key: { affiliateId: ctx.affiliateId, key: idemKey } },
      });
      if (cached && cached.expiresAt > new Date()) {
        return NextResponse.json(cached.responseBody as object, { status: cached.responseCode });
      }
    }

    const rl = await checkRateLimit(`rl:intake:${ctx.keyId}`, { capacity: 30, refillPerSec: 2 });
    if (!rl.allowed) {
      const r = err("rate_limited", "too many requests", 429, trace_id);
      r.headers.set("Retry-After", String(rl.retryAfterSec));
      return r;
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return err("malformed_json", "invalid json body", 400, trace_id);
    }
    const parsed = IntakeSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return err("validation_error", first.message, 422, trace_id, first.path.join("."));
    }
    const p = parsed.data;

    // Normalize
    const phoneE164 = p.phone ? normalizePhone(p.phone, p.geo) : null;
    if (p.phone && !phoneE164)
      return err("invalid_phone", "could not normalize phone", 422, trace_id, "phone");
    const email = p.email?.toLowerCase() ?? null;
    const phoneHash = phoneE164 ? sha256(phoneE164) : null;
    const emailHash = email ? sha256(email) : null;
    const geo = p.geo.toUpperCase();

    // Anti-fraud
    const bl = await checkBlacklists({ ip: p.ip, email, phoneE164 });
    let rejectReason: string | null = bl;

    if (
      !rejectReason &&
      (await isDuplicate(ctx.affiliateId, { phoneHash, emailHash }, DEDUP_DAYS))
    ) {
      rejectReason = "duplicate";
    }

    if (!rejectReason) {
      const aff = await prisma.affiliate.findUnique({
        where: { id: ctx.affiliateId },
        select: { totalDailyCap: true },
      });
      if (aff?.totalDailyCap != null) {
        const count = await incrementCap("AFFILIATE", ctx.affiliateId, todayUtc());
        if (count > aff.totalDailyCap) rejectReason = "affiliate_cap_full";
      }
    }

    const lead = await prisma.lead.create({
      data: {
        affiliateId: ctx.affiliateId,
        externalLeadId: p.external_lead_id,
        firstName: p.first_name,
        lastName: p.last_name,
        email,
        phone: phoneE164,
        phoneHash,
        emailHash,
        geo,
        ip: p.ip,
        landingUrl: p.landing_url,
        subId: p.sub_id,
        utm: (p.utm ?? {}) as object,
        eventTs: new Date(p.event_ts),
        traceId: trace_id,
        state: rejectReason ? "REJECTED" : "NEW",
        rejectReason,
        events: {
          create: [
            { kind: "RECEIVED", meta: { ip: p.ip, geo } },
            ...(rejectReason
              ? [{ kind: "REJECTED_ANTIFRAUD" as const, meta: { reason: rejectReason } }]
              : []),
          ],
        },
      },
    });

    const body = {
      lead_id: lead.id,
      status: rejectReason ? "rejected" : "received",
      reject_reason: rejectReason,
      trace_id,
      received_at: lead.receivedAt.toISOString(),
    };
    const status = 202;

    if (idemKey) {
      const ttl = new Date(Date.now() + 24 * 3600 * 1000);
      await prisma.idempotencyKey.upsert({
        where: { affiliateId_key: { affiliateId: ctx.affiliateId, key: idemKey } },
        create: {
          key: idemKey,
          affiliateId: ctx.affiliateId,
          leadId: lead.id,
          responseCode: status,
          responseBody: body,
          expiresAt: ttl,
        },
        update: {},
      });
    }

    logger.info(
      {
        event: "lead_received",
        lead_id: lead.id,
        affiliate_id: ctx.affiliateId,
        geo,
        state: lead.state,
      },
      "lead received",
    );

    // TODO Task 22: enqueue push-lead job if state === NEW

    return NextResponse.json(body, { status });
  });
}
