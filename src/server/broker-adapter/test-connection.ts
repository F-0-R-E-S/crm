import { applyBrokerAuth } from "@/server/broker-adapter/auth";
import {
  type MappingConfig,
  applyMappingWithTransforms,
  maskPII,
} from "@/server/broker-adapter/mapping-preview";
import type { BrokerAuthType, HttpMethod } from "@prisma/client";

export interface TestConnectionBroker {
  id: string;
  endpointUrl: string;
  httpMethod: HttpMethod;
  authType: BrokerAuthType;
  authConfig: Record<string, unknown>;
  headers: Record<string, string>;
  fieldMapping: MappingConfig;
  staticPayload: Record<string, unknown>;
}

export type AuthStatus =
  | "ok"
  | "timeout"
  | "auth_fail"
  | "http_4xx"
  | "http_5xx"
  | "dns_error"
  | "network_error";

export interface TestConnectionResult {
  auth_status: AuthStatus;
  http_status: number | null;
  latency_ms: number;
  sample_payload_masked: Record<string, unknown>;
  sample_response: unknown;
  error_class: AuthStatus | null;
  error_message: string | null;
}

const SAMPLE_LEAD = {
  firstName: "Test",
  lastName: "Lead",
  email: "test.lead@example.com",
  phone: "+10000000000",
  geo: "XX",
  ip: "8.8.8.8",
  subId: "test",
};

function classifyHttp(status: number): AuthStatus {
  if (status === 401 || status === 403) return "auth_fail";
  if (status >= 200 && status < 300) return "ok";
  if (status >= 400 && status < 500) return "http_4xx";
  return "http_5xx";
}

function classifyError(e: unknown): { status: AuthStatus; message: string } {
  if (e instanceof Error) {
    if (e.name === "AbortError") return { status: "timeout", message: "request aborted by timeout" };
    const anyE = e as Error & { code?: string };
    if (anyE.code === "ENOTFOUND" || /ENOTFOUND/i.test(e.message))
      return { status: "network_error", message: e.message };
    if (anyE.code === "ECONNREFUSED" || anyE.code === "ECONNRESET")
      return { status: "network_error", message: e.message };
    return { status: "network_error", message: e.message };
  }
  return { status: "network_error", message: "unknown error" };
}

export async function testBrokerConnection(
  broker: TestConnectionBroker,
  opts: { timeoutMs: number },
): Promise<TestConnectionResult> {
  const body = applyMappingWithTransforms(SAMPLE_LEAD, broker.fieldMapping, broker.staticPayload);
  const maskedPayload = maskPII(body);

  const authed = applyBrokerAuth(
    broker.endpointUrl,
    broker.headers,
    broker.authType,
    broker.authConfig,
  );
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(authed.url, {
      method: broker.httpMethod,
      headers: { "content-type": "application/json", ...authed.headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const ct = res.headers.get("content-type") ?? "";
    let sample: unknown;
    try {
      sample = ct.includes("json") ? await res.json() : await res.text();
    } catch {
      sample = null;
    }
    const klass = classifyHttp(res.status);
    return {
      auth_status: klass,
      http_status: res.status,
      latency_ms: latencyMs,
      sample_payload_masked: maskedPayload,
      sample_response: sample,
      error_class: klass === "ok" ? null : klass,
      error_message: klass === "ok" ? null : `http ${res.status}`,
    };
  } catch (e) {
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const cls = classifyError(e);
    return {
      auth_status: cls.status,
      http_status: null,
      latency_ms: latencyMs,
      sample_payload_masked: maskedPayload,
      sample_response: null,
      error_class: cls.status,
      error_message: cls.message,
    };
  }
}
