import { GET as HEALTH } from "@/app/api/v1/health/route";
import { GET as METRICS } from "@/app/api/v1/metrics/summary/route";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
import { auth } from "@/auth";

describe("/api/v1/health", () => {
  it("returns ok/degraded with db+redis+queue+version", async () => {
    const res = await HEALTH();
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.db).toBeDefined();
    expect(body.redis).toBeDefined();
    expect(body.queue).toBeDefined();
    expect(typeof body.queue.pending).toBe("number");
    expect(typeof body.queue.failed_last_hour).toBe("number");
    // Accepts both stable (1.2.3) and prerelease (1.5.0-s1) versions.
    expect(body.version).toMatch(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/);
  });
});

describe("/api/v1/metrics/summary", () => {
  beforeEach(async () => {
    await redis.flushdb();
    vi.mocked(auth).mockReset();
  });

  it("401 without session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await METRICS();
    expect(res.status).toBe(401);
  });

  it("403 for non-ADMIN session", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "OPERATOR", email: "o@x.com" },
      expires: "2099-01-01",
    } as never);
    const res = await METRICS();
    expect(res.status).toBe(403);
  });

  it("returns the 5 counters + window for ADMIN", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", role: "ADMIN", email: "a@x.com" },
      expires: "2099-01-01",
    } as never);
    const res = await METRICS();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.window_seconds).toBe(60);
    expect(body.leads_received).toBeGreaterThanOrEqual(0);
    expect(body.leads_pushed).toBeGreaterThanOrEqual(0);
    expect(body.fraud_hit).toBeGreaterThanOrEqual(0);
    expect(body.broker_down_count).toBeGreaterThanOrEqual(0);
    expect(body.manual_queue_depth).toBeGreaterThanOrEqual(0);
  });
});
