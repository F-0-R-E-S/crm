import { GET } from "@/app/api/v1/brokers/[id]/errors/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

describe("GET /api/v1/brokers/{id}/errors", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
  });

  it("200 с error_rate/latency + sla.error_rate_alert=true при >5%", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "a" } });
    const b = await prisma.broker.create({
      data: {
        name: "ee",
        endpointUrl: "https://example.com",
        fieldMapping: {} as object,
        postbackSecret: "s".repeat(32),
        postbackLeadIdPath: "$.id",
        postbackStatusPath: "$.s",
      },
    });
    for (let i = 0; i < 20; i++) {
      const lead = await prisma.lead.create({
        data: {
          affiliateId: aff.id,
          brokerId: b.id,
          geo: "UA",
          ip: "1.1.1.1",
          eventTs: new Date(),
          traceId: `t-${i}`,
          state: i < 18 ? "PUSHED" : "FAILED",
        },
      });
      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          kind: i < 18 ? "BROKER_PUSH_SUCCESS" : "BROKER_PUSH_FAIL",
          meta: {
            httpStatus: i < 18 ? 200 : 502,
            durationMs: 100 + i,
          } as object,
        },
      });
    }
    const from = new Date(Date.now() - 3600_000).toISOString();
    const to = new Date(Date.now() + 3600_000).toISOString();
    const r = await GET(
      new Request(`http://localhost/api/v1/brokers/${b.id}/errors?from=${from}&to=${to}`),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.total_pushes).toBe(20);
    expect(body.error_pushes).toBe(2);
    expect(body.error_rate).toBeCloseTo(0.1, 2);
    expect(body.sla.error_rate_alert).toBe(true);
  });

  it("400 invalid_date_range", async () => {
    const b = await prisma.broker.create({
      data: {
        name: "e2",
        endpointUrl: "https://example.com",
        fieldMapping: {} as object,
        postbackSecret: "s".repeat(32),
        postbackLeadIdPath: "$.id",
        postbackStatusPath: "$.s",
      },
    });
    const r = await GET(
      new Request(
        `http://localhost/api/v1/brokers/${b.id}/errors?from=2026-04-20T10:00:00Z&to=2026-04-20T09:00:00Z`,
      ),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(r.status).toBe(400);
  });
});
