import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { checkBlacklists } from "@/server/antifraud/blacklist";
import { detectDuplicate } from "@/server/antifraud/dedup";
import { normalizeIntake } from "@/server/antifraud/normalization";
import { verifyApiKey } from "@/server/auth-api-key";
import { prisma } from "@/server/db";
import { getFraudPolicy } from "@/server/intake/fraud-policy-cache";
import { computeFraudScore } from "@/server/intake/fraud-score";
import { buildSignals } from "@/server/intake/fraud-signals";
import { determineMockOutcome, mockOutcomeToResponse } from "@/server/intake/sandbox";
import { getIntakeSettings } from "@/server/intake/settings";
import { JOB_NAMES, startBossOnce } from "@/server/jobs/queue";
import { logger, runWithTrace } from "@/server/observability";
import { checkRateLimit } from "@/server/ratelimit";
import { incrementCap, todayUtc } from "@/server/routing/caps";
import {
  DEFAULT_VERSION,
  getSchemaForVersion,
  getVersionEntry,
  parseWithMode,
} from "@/server/schema/registry";
import { buildIntakeEvent, dispatchIntakeEvent } from "@/server/webhooks/intake-outcome";
import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const DEDUP_DAYS = env.ANTIFRAUD_DEDUP_WINDOW_DAYS;

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

    const url = new URL(req.url);
    const sandboxMode = url.searchParams.get("mode") === "sandbox";
    if (sandboxMode && !ctx.isSandbox) {
      return err("sandbox_forbidden", "production key cannot call sandbox mode", 403, trace_id);
    }
    if (!sandboxMode && ctx.isSandbox) {
      return err("sandbox_required", "sandbox key must use ?mode=sandbox", 403, trace_id);
    }
    if (sandboxMode) {
      const bodyTextSb = await req.text();
      let rawSb: Record<string, unknown> = {};
      try {
        rawSb = JSON.parse(bodyTextSb);
      } catch {
        // ignore — determinism by external_lead_id optional
      }
      const outcome = determineMockOutcome((rawSb.external_lead_id as string) ?? null);
      const resp = mockOutcomeToResponse(outcome, trace_id);
      return NextResponse.json(resp.body, { status: resp.status });
    }

    const settings = await getIntakeSettings(ctx.affiliateId);
    const idemKey = req.headers.get("x-idempotency-key");

    const rl = await checkRateLimit(`rl:intake:${ctx.keyId}`, {
      capacity: Math.max(10, Math.floor(settings.maxRpm / 2)),
      refillPerSec: Math.max(1, Math.floor(settings.maxRpm / 60)),
    });
    if (!rl.allowed) {
      const r = err("rate_limited", "too many requests", 429, trace_id);
      r.headers.set("Retry-After", String(rl.retryAfterSec));
      return r;
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > env.INTAKE_MAX_PAYLOAD_BYTES) {
      return err(
        "payload_too_large",
        `body exceeds ${env.INTAKE_MAX_PAYLOAD_BYTES} bytes`,
        413,
        trace_id,
      );
    }
    const bodyText = await req.text();
    if (Buffer.byteLength(bodyText, "utf8") > env.INTAKE_MAX_PAYLOAD_BYTES) {
      return err(
        "payload_too_large",
        `body exceeds ${env.INTAKE_MAX_PAYLOAD_BYTES} bytes`,
        413,
        trace_id,
      );
    }
    const payloadHash = sha256(bodyText);
    if (idemKey) {
      const cached = await prisma.idempotencyKey.findUnique({
        where: { affiliateId_key: { affiliateId: ctx.affiliateId, key: idemKey } },
      });
      if (cached && cached.expiresAt > new Date()) {
        if (cached.payloadHash !== payloadHash) {
          return err(
            "idempotency_mismatch",
            "payload differs from original request for same idempotency key",
            409,
            trace_id,
            "x-idempotency-key",
          );
        }
        return NextResponse.json(cached.responseBody as object, { status: cached.responseCode });
      }
    }
    let raw: unknown;
    try {
      raw = JSON.parse(bodyText);
    } catch {
      return err("malformed_json", "invalid json body", 400, trace_id);
    }
    const requestedVersion = req.headers.get("x-api-version") ?? DEFAULT_VERSION;
    const schema = getSchemaForVersion(requestedVersion);
    if (!schema) {
      return err(
        "unsupported_version",
        `api version ${requestedVersion} is not supported`,
        400,
        trace_id,
        "x-api-version",
      );
    }
    const mode = env.INTAKE_STRICT_UNKNOWN_FIELDS ? "strict" : "compat";
    const parsed = parseWithMode(schema, raw, mode);
    if (!parsed.success) {
      const first = parsed.issues[0];
      if (first.code === "unrecognized_keys") {
        const key = (first as unknown as { keys?: string[] }).keys?.[0] ?? "unknown";
        return err("unknown_field", first.message, 422, trace_id, key);
      }
      return err("validation_error", first.message, 422, trace_id, first.path.join("."));
    }
    if (parsed.unknownFields.length) {
      logger.warn(
        { event: "intake_unknown_fields", unknown: parsed.unknownFields },
        "compat-mode ignored unknown fields",
      );
    }
    const p = parsed.data as {
      external_lead_id?: string;
      first_name?: string;
      last_name?: string;
      email?: string | null;
      phone?: string | null;
      geo: string;
      ip: string;
      landing_url?: string;
      sub_id?: string;
      utm?: Record<string, unknown>;
      event_ts: string;
    };

    // Normalize (phone E.164 / email lowercase / GEO ISO-3166-1 + warnings)
    const n = normalizeIntake({
      phone: p.phone,
      email: p.email,
      geo: p.geo,
      ip: p.ip,
      landingUrl: p.landing_url,
    });
    if (n.error) {
      return err(
        n.error.code,
        `normalization failed: ${n.error.field}`,
        422,
        trace_id,
        n.error.field,
      );
    }
    const phoneE164 = n.phoneE164;
    const email = n.email;
    const geo = n.geo as string;
    const phoneHash = phoneE164 ? sha256(phoneE164) : null;
    const emailHash = email ? sha256(email) : null;

    // Apply affiliate intake-settings (STORY-007)
    if (settings.allowedGeo.length > 0 && !settings.allowedGeo.includes(geo)) {
      return err("geo_not_allowed", `geo ${geo} not in allowed list`, 422, trace_id, "geo");
    }
    for (const rf of settings.requiredFields) {
      if (rf === "phone" && !phoneE164)
        return err("missing_required_field", "phone required", 422, trace_id, "phone");
      if (rf === "email" && !email)
        return err("missing_required_field", "email required", 422, trace_id, "email");
      if (rf === "first_name" && !p.first_name)
        return err("missing_required_field", "first_name required", 422, trace_id, "first_name");
      if (rf === "last_name" && !p.last_name)
        return err("missing_required_field", "last_name required", 422, trace_id, "last_name");
    }

    // Anti-fraud: blacklist first
    const bl = await checkBlacklists({ ip: p.ip, email, phoneE164 });
    let rejectReason: string | null = bl;

    // Dedup: multi-strategy → 409 on hit
    if (!rejectReason) {
      const fingerprint =
        email || phoneE164 ? sha256(`${email ?? ""}|${phoneE164 ?? ""}|${geo}`) : null;
      const ipLandingFingerprint =
        !email && !phoneE164 && p.landing_url ? sha256(`${p.ip}|${p.landing_url}`) : null;
      const dd = await detectDuplicate({
        affiliateId: ctx.affiliateId,
        externalLeadId: p.external_lead_id ?? null,
        phoneHash,
        emailHash,
        fingerprint,
        ipLandingFingerprint,
        windowDays: settings.dedupeWindowDays,
        crossAffiliate: env.ANTIFRAUD_DEDUP_CROSS_AFFILIATE,
      });
      if (dd.duplicate) {
        return NextResponse.json(
          {
            error: {
              code: "duplicate_lead",
              message: "lead already seen",
              trace_id,
              existing_lead_id: dd.existingLeadId,
              matched_by: dd.matchedBy,
              first_seen_at: dd.firstSeenAt.toISOString(),
              confidence: dd.confidence,
            },
          },
          { status: 409 },
        );
      }
    }

    // Fraud score (W2.1 + W2.2 enforcement)
    const fraudPolicy = await getFraudPolicy();
    const fraudSignals = buildSignals({
      blacklistHit: bl,
      phoneE164,
      geo,
      dedupHit: false,
      voipHit: false,
    });
    const fraud = computeFraudScore(fraudSignals, fraudPolicy);
    // JSON-serializable form of signals for Prisma Json columns.
    const firedJson: Prisma.InputJsonValue = fraud.fired.map((f) => ({
      kind: f.kind,
      weight: f.weight,
      ...(f.detail !== undefined ? { detail: f.detail as Prisma.InputJsonValue } : {}),
    }));
    // W2.2: enforce auto-reject for scores at/above the threshold.
    let autoFraudReject = false;
    let needsReview = false;
    if (!rejectReason && fraud.score >= fraudPolicy.autoRejectThreshold) {
      autoFraudReject = true;
      rejectReason = "fraud_auto";
    } else if (
      !rejectReason &&
      fraud.score >= fraudPolicy.borderlineMin &&
      fraud.score < fraudPolicy.autoRejectThreshold
    ) {
      needsReview = true;
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

    // Pick final state: REJECTED_FRAUD for auto-fraud, REJECTED for other reject reasons,
    // NEW otherwise.
    const finalState: "NEW" | "REJECTED" | "REJECTED_FRAUD" = autoFraudReject
      ? "REJECTED_FRAUD"
      : rejectReason
        ? "REJECTED"
        : "NEW";

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
        normalizationWarnings: n.warnings as unknown as object,
        rawPayload: { phone: n.raw.phone, email: n.raw.email, geo: n.raw.geo },
        eventTs: new Date(p.event_ts),
        traceId: trace_id,
        state: finalState,
        rejectReason,
        fraudScore: fraud.score,
        fraudSignals: firedJson,
        needsReview,
        events: {
          create: [
            { kind: "RECEIVED", meta: { ip: p.ip, geo } },
            {
              kind: "FRAUD_SCORED" as const,
              meta: {
                score: fraud.score,
                signals: firedJson,
                policyVersion: fraudPolicy.version,
                autoFraudReject,
                needsReview,
              },
            },
            ...(rejectReason
              ? [{ kind: "REJECTED_ANTIFRAUD" as const, meta: { reason: rejectReason } }]
              : []),
          ],
        },
      },
    });

    const responseStatus: "received" | "rejected" | "rejected_fraud" = autoFraudReject
      ? "rejected_fraud"
      : rejectReason
        ? "rejected"
        : "received";
    const body: Record<string, unknown> = {
      lead_id: lead.id,
      status: responseStatus,
      reject_reason: rejectReason,
      normalization_warnings: n.warnings,
      trace_id,
      received_at: lead.receivedAt.toISOString(),
    };
    if (autoFraudReject) {
      // Expose signal kinds only — do NOT leak weights (per spec).
      body.reason_codes = fraud.fired.map((f) => f.kind);
    }
    if (needsReview) body.needs_review = true;
    const status = 202;

    if (idemKey) {
      const ttl = new Date(Date.now() + 24 * 3600 * 1000);
      await prisma.idempotencyKey.upsert({
        where: { affiliateId_key: { affiliateId: ctx.affiliateId, key: idemKey } },
        create: {
          key: idemKey,
          affiliateId: ctx.affiliateId,
          leadId: lead.id,
          payloadHash,
          responseCode: status,
          responseBody: body as Prisma.InputJsonValue,
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

    if (lead.state === "NEW") {
      const boss = await startBossOnce();
      await boss.send(JOB_NAMES.pushLead, { leadId: lead.id, traceId: trace_id });
      if (env.ANTIFRAUD_VOIP_CHECK_ENABLED && phoneE164) {
        await boss.send(JOB_NAMES.voipCheck, { leadId: lead.id });
      }
    }

    // STORY-011: dispatch intake outcome to affiliate webhooks (async fire-and-forget)
    const intakeEventType: "intake.accepted" | "intake.rejected" | "intake.duplicate" =
      rejectReason === "duplicate"
        ? "intake.duplicate"
        : rejectReason
          ? "intake.rejected"
          : "intake.accepted";
    try {
      await dispatchIntakeEvent(
        ctx.affiliateId,
        buildIntakeEvent(intakeEventType, {
          leadId: lead.id,
          affiliateId: ctx.affiliateId,
          traceId: trace_id,
          rejectReason,
        }),
      );
    } catch (e) {
      logger.warn({ event: "intake_webhook_dispatch_failed", err: (e as Error).message });
    }

    const response = NextResponse.json(body, { status });
    const entry = getVersionEntry(requestedVersion);
    if (entry?.status === "deprecated") {
      response.headers.set(
        "X-API-Deprecation",
        `version=${entry.version}; sunset=${entry.sunsetAt ?? "TBD"}`,
      );
    }
    return response;
  });
}
