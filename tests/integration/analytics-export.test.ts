import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1", email: "u@t.io", role: "ADMIN" } })),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { GET: exportGet } = await import("@/app/api/v1/analytics/export/route");

describe("GET /api/v1/analytics/export", () => {
  let affiliateId = "";
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "u1", email: "u@t.io", passwordHash: "x", role: "ADMIN" },
    });
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    affiliateId = aff.id;
    await prisma.leadDailyRoll.create({
      data: {
        date: new Date("2026-06-01T00:00:00Z"),
        affiliateId,
        brokerId: "__none__",
        geo: "US",
        totalReceived: 10,
      },
    });
  });

  it("returns text/csv with header and at least one row for metricSeries", async () => {
    const query = encodeURIComponent(
      JSON.stringify({
        proc: "metricSeries",
        from: "2026-06-01",
        to: "2026-06-02",
        groupBy: "day",
        metric: "leads",
        filters: { affiliateIds: [], brokerIds: [], geos: [] },
        compareTo: null,
      }),
    );
    const res = await exportGet(
      new Request(`http://localhost/api/v1/analytics/export?query=${query}`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("text/csv");
    const body = await res.text();
    const lines = body.trim().split("\n");
    expect(lines[0]).toBe("bucket,value");
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
});
