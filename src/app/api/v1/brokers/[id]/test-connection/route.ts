import { auth } from "@/auth";
import {
  type TestConnectionBroker,
  testBrokerConnection,
} from "@/server/broker-adapter/test-connection";
import { recordHealthCheck } from "@/server/broker-health/check";
import { prisma } from "@/server/db";
import { logger, runWithTrace } from "@/server/observability";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const HARD_MAX_MS = 5000;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const trace_id = nanoid();
  return runWithTrace(trace_id, async () => {
    const s = await auth();
    if (!s?.user || s.user.role !== "ADMIN")
      return NextResponse.json({ error: { code: "forbidden", trace_id } }, { status: 403 });

    const { id } = await params;
    const broker = await prisma.broker.findUnique({ where: { id } });
    if (!broker)
      return NextResponse.json({ error: { code: "broker_not_found", trace_id } }, { status: 404 });

    const url = new URL(req.url);
    const timeoutMs = Math.min(
      Number(url.searchParams.get("timeout_ms") ?? HARD_MAX_MS) || HARD_MAX_MS,
      HARD_MAX_MS,
    );

    const input: TestConnectionBroker = {
      id: broker.id,
      endpointUrl: broker.endpointUrl,
      httpMethod: broker.httpMethod,
      authType: broker.authType,
      authConfig: broker.authConfig as Record<string, unknown>,
      headers: (broker.headers as Record<string, string>) ?? {},
      fieldMapping: broker.fieldMapping as unknown as TestConnectionBroker["fieldMapping"],
      staticPayload: (broker.staticPayload as Record<string, unknown>) ?? {},
    };

    const result = await testBrokerConnection(input, { timeoutMs });
    await recordHealthCheck(broker.id, result);

    if (result.auth_status === "timeout") {
      return NextResponse.json(
        {
          error: { code: "broker_timeout", trace_id },
          latency_ms: result.latency_ms,
          auth_status: result.auth_status,
        },
        { status: 504 },
      );
    }

    logger.info(
      {
        event: "broker_test_connection",
        broker_id: broker.id,
        auth_status: result.auth_status,
        latency_ms: result.latency_ms,
      },
      "test-connection",
    );

    return NextResponse.json({
      trace_id,
      auth_status: result.auth_status,
      http_status: result.http_status,
      latency_ms: result.latency_ms,
      sample_payload_masked: result.sample_payload_masked,
      sample_response: result.sample_response,
      error_class: result.error_class,
      error_message: result.error_message,
    });
  });
}
