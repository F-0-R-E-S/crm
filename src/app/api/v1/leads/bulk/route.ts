import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { verifyApiKey } from "@/server/auth-api-key";
import { prisma } from "@/server/db";
import { processBulkSync } from "@/server/intake/bulk";
import { clientIpAllowed, extractClientIp } from "@/server/intake/check-ip";
import { JOB_NAMES, startBossOnce } from "@/server/jobs/queue";
import { logger, runWithTrace } from "@/server/observability";
import { checkRateLimit } from "@/server/ratelimit";
import { DEFAULT_VERSION } from "@/server/schema/registry";
import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

const BulkBodySchema = z.object({ leads: z.array(z.unknown()).min(1) });

function err(code: string, message: string, status: number, trace_id: string) {
  return NextResponse.json({ error: { code, message, trace_id } }, { status });
}

export async function POST(req: Request) {
  const trace_id = nanoid();
  return runWithTrace(trace_id, async () => {
    const ctx = await verifyApiKey(req.headers.get("authorization"));
    if (!ctx) return err("unauthorized", "invalid api key", 401, trace_id);

    if (ctx.allowedIps.length > 0) {
      const ip = extractClientIp(req);
      if (!ip || !clientIpAllowed(ip, ctx.allowedIps)) {
        return err("ip_not_allowed", "source ip not allowed for this api key", 403, trace_id);
      }
    }

    const rl = await checkRateLimit(`rl:bulk:${ctx.keyId}`, { capacity: 10, refillPerSec: 1 });
    if (!rl.allowed) {
      const r = err("rate_limited", "too many requests", 429, trace_id);
      r.headers.set("Retry-After", String(rl.retryAfterSec));
      return r;
    }

    const bodyText = await req.text();
    if (Buffer.byteLength(bodyText, "utf8") > env.INTAKE_BULK_MAX_BYTES) {
      return err(
        "payload_too_large",
        `body exceeds ${env.INTAKE_BULK_MAX_BYTES} bytes`,
        413,
        trace_id,
      );
    }

    const payloadHash = sha256(bodyText);
    const idemKey = req.headers.get("x-idempotency-key");
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
          );
        }
        return NextResponse.json(cached.responseBody as object, {
          status: cached.responseCode,
        });
      }
    }

    let raw: unknown;
    try {
      raw = JSON.parse(bodyText);
    } catch {
      return err("malformed_json", "invalid json", 400, trace_id);
    }

    const parsed = BulkBodySchema.safeParse(raw);
    if (!parsed.success) return err("validation_error", "leads[] required", 422, trace_id);
    const items = parsed.data.leads;
    if (items.length > env.INTAKE_BULK_MAX_ITEMS) {
      return err("payload_too_large", `max ${env.INTAKE_BULK_MAX_ITEMS} items`, 413, trace_id);
    }

    const version = req.headers.get("x-api-version") ?? DEFAULT_VERSION;

    let responseBody: Record<string, unknown>;
    let status: number;
    if (items.length > env.INTAKE_BULK_SYNC_THRESHOLD) {
      const boss = await startBossOnce();
      const jobId = await boss.send(JOB_NAMES.bulkIntake, {
        affiliateId: ctx.affiliateId,
        items,
        version,
        traceId: trace_id,
      });
      responseBody = { status: "queued", job_id: jobId, trace_id };
      status = 202;
    } else {
      const results = await processBulkSync(ctx.affiliateId, items, version, trace_id);
      logger.info(
        { event: "bulk_intake_sync", affiliate_id: ctx.affiliateId, count: items.length },
        "bulk processed",
      );
      responseBody = { results, trace_id };
      status = 207;
    }

    if (idemKey) {
      await prisma.idempotencyKey.upsert({
        where: { affiliateId_key: { affiliateId: ctx.affiliateId, key: idemKey } },
        create: {
          key: idemKey,
          affiliateId: ctx.affiliateId,
          payloadHash,
          responseCode: status,
          responseBody: responseBody as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
        },
        update: {},
      });
    }

    return NextResponse.json(responseBody, { status });
  });
}
