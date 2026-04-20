import { GET } from "@/app/api/v1/intake/metrics/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

describe("GET /api/v1/intake/metrics", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("invalid_date_range → 400", async () => {
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const r = await GET(
      new Request(
        "http://localhost:3000/api/v1/intake/metrics?from=2026-04-20T10:00:00Z&to=2026-04-20T09:00:00Z&interval=1h",
      ),
    );
    expect(r.status).toBe(400);
    const b = await r.json();
    expect(b.error.code).toBe("invalid_date_range");
  });

  it("возвращает buckets", async () => {
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const aff = await prisma.affiliate.create({ data: { name: "mt" } });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "UA",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "mt1",
        state: "NEW",
      },
    });
    const from = new Date(Date.now() - 3600_000).toISOString();
    const to = new Date(Date.now() + 3600_000).toISOString();
    const r = await GET(
      new Request(
        `http://localhost:3000/api/v1/intake/metrics?from=${from}&to=${to}&interval=1h`,
      ),
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(Array.isArray(b.buckets)).toBe(true);
  });
});
