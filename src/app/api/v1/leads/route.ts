import { verifyApiKey } from "@/server/auth-api-key";
import { logger, runWithTrace } from "@/server/observability";
import { checkRateLimit } from "@/server/ratelimit";
import { IntakeSchema } from "@/server/zod/intake";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

function errorResponse(
  code: string,
  message: string,
  status: number,
  trace_id: string,
  field?: string,
) {
  return NextResponse.json({ error: { code, message, field, trace_id } }, { status });
}

export async function POST(req: Request) {
  const trace_id = nanoid();
  return runWithTrace(trace_id, async () => {
    // 1. Auth
    const ctx = await verifyApiKey(req.headers.get("authorization"));
    if (!ctx) return errorResponse("unauthorized", "invalid api key", 401, trace_id);

    // 2. Rate limit
    const rl = await checkRateLimit(`rl:intake:${ctx.keyId}`, { capacity: 30, refillPerSec: 2 });
    if (!rl.allowed) {
      const r = errorResponse("rate_limited", "too many requests", 429, trace_id);
      r.headers.set("Retry-After", String(rl.retryAfterSec));
      return r;
    }

    // 3. Parse + validate
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return errorResponse("malformed_json", "invalid json body", 400, trace_id);
    }
    const parsed = IntakeSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return errorResponse("validation_error", first.message, 422, trace_id, first.path.join("."));
    }

    // stub: will be completed in Task 18
    logger.info({ event: "intake_stub", affiliateId: ctx.affiliateId }, "intake stub reached");
    return NextResponse.json({ status: "stub", trace_id }, { status: 202 });
  });
}
