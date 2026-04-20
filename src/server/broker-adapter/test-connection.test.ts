import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type TestConnectionBroker, testBrokerConnection } from "./test-connection";

function mockBroker(overrides: Partial<TestConnectionBroker> = {}): TestConnectionBroker {
  return {
    id: "b1",
    endpointUrl: "https://example.com/leads",
    httpMethod: "POST",
    authType: "NONE",
    authConfig: {},
    headers: {},
    fieldMapping: { firstName: { target: "first_name" }, email: { target: "email" } },
    staticPayload: { source: "test" },
    ...overrides,
  };
}

describe("testBrokerConnection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auth_status=ok + latency_ms + sample_response на 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ lead_id: "x-1", status: "received" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const r = await testBrokerConnection(mockBroker(), { timeoutMs: 5000 });
    expect(r.auth_status).toBe("ok");
    expect(r.http_status).toBe(200);
    expect(r.latency_ms).toBeGreaterThanOrEqual(0);
    expect(r.sample_response).toMatchObject({ lead_id: "x-1" });
    expect(r.error_class).toBeNull();
  });

  it("auth_status=auth_fail на 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );
    const r = await testBrokerConnection(mockBroker(), { timeoutMs: 5000 });
    expect(r.auth_status).toBe("auth_fail");
    expect(r.http_status).toBe(401);
    expect(r.error_class).toBe("auth_fail");
  });

  it("auth_status=http_4xx на 422", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response('{"err":"bad"}', { status: 422 }),
    );
    const r = await testBrokerConnection(mockBroker(), { timeoutMs: 5000 });
    expect(r.auth_status).toBe("http_4xx");
  });

  it("timeout → status=timeout + http_status=null", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      (_, init) =>
        new Promise((_, reject) => {
          (init?.signal as AbortSignal).addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          );
        }),
    );
    const r = await testBrokerConnection(mockBroker(), { timeoutMs: 50 });
    expect(r.auth_status).toBe("timeout");
    expect(r.error_class).toBe("timeout");
  });

  it("DNS/network error → status=network_error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      Object.assign(new Error("getaddrinfo ENOTFOUND badhost"), { code: "ENOTFOUND" }),
    );
    const r = await testBrokerConnection(
      mockBroker({ endpointUrl: "https://badhost.invalid/leads" }),
      { timeoutMs: 5000 },
    );
    expect(r.auth_status).toBe("network_error");
    expect(r.error_class).toBe("network_error");
  });
});
