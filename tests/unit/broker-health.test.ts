import { probeBrokerEndpoint } from "@/server/onboarding/broker-health";
import { describe, expect, it, vi } from "vitest";

function mkResp(status: number): Response {
  return new Response("", { status }) as Response;
}

describe("probeBrokerEndpoint", () => {
  it("treats 200 as reachable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mkResp(200));
    const r = await probeBrokerEndpoint("https://x.io/probe", "POST", fetchImpl);
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
  });

  it("treats 401 as reachable (auth failure is not a broker outage)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mkResp(401));
    const r = await probeBrokerEndpoint("https://x.io/probe", "POST", fetchImpl);
    expect(r.ok).toBe(true);
    expect(r.status).toBe(401);
  });

  it("flags 502 as down", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mkResp(502));
    const r = await probeBrokerEndpoint("https://x.io/probe", "POST", fetchImpl);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(502);
  });

  it("flags rejected fetch (ENOTFOUND) as down", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ENOTFOUND x.io"));
    const r = await probeBrokerEndpoint("https://x.io/probe", "POST", fetchImpl);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ENOTFOUND/);
  });
});
