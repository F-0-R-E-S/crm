import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pushToBroker } from "./push";

describe("pushToBroker", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("succeeds on 2xx and extracts id via JSONPath", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ lead: { id: "ext-123" } }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const r = await pushToBroker({ url: "http://x", method: "POST", headers: {}, body: {}, responseIdPath: "lead.id", timeoutMs: 500, maxAttempts: 3 });
    expect(r.success).toBe(true);
    expect(r.externalId).toBe("ext-123");
  });

  it("retries on 500 and succeeds", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "ok" }), { status: 200 }));
    global.fetch = fn as never;
    const r = await pushToBroker({ url: "http://x", method: "POST", headers: {}, body: {}, responseIdPath: "id", timeoutMs: 500, maxAttempts: 3, backoffMs: [0, 0] });
    expect(r.success).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400", async () => {
    const fn = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));
    global.fetch = fn as never;
    const r = await pushToBroker({ url: "http://x", method: "POST", headers: {}, body: {}, timeoutMs: 500, maxAttempts: 3, backoffMs: [0, 0] });
    expect(r.success).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exhausts retries then fails", async () => {
    const fn = vi.fn().mockResolvedValue(new Response("boom", { status: 503 }));
    global.fetch = fn as never;
    const r = await pushToBroker({ url: "http://x", method: "POST", headers: {}, body: {}, timeoutMs: 500, maxAttempts: 3, backoffMs: [0, 0] });
    expect(r.success).toBe(false);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
