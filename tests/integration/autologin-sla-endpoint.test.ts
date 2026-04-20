import { GET as slaGET } from "@/app/api/v1/autologin/sla/route";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

describe("GET /api/v1/autologin/sla", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("400 when from param is not parseable as a date", async () => {
    const res = await slaGET(
      new Request("http://x/api/v1/autologin/sla?from=nope"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_date");
  });

  it("400 when window > 31 days", async () => {
    const to = new Date("2026-05-01T00:00:00Z");
    const from = new Date(to.getTime() - 32 * 86_400_000);
    const res = await slaGET(
      new Request(
        `http://x/api/v1/autologin/sla?from=${from.toISOString()}&to=${to.toISOString()}`,
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("window_too_large_max_31d");
  });

  it("200 with total=0 and uptime_pct=0 on an empty DB", async () => {
    const res = await slaGET(new Request("http://x/api/v1/autologin/sla"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.uptime_pct).toBe(0);
    expect(body.p50_duration_ms).toBeNull();
    expect(body.p95_duration_ms).toBeNull();
    expect(body.by_stage_failed).toEqual({
      INITIATING: 0,
      CAPTCHA: 0,
      AUTHENTICATING: 0,
      SESSION_READY: 0,
    });
  });
});
