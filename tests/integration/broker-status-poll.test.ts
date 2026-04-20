import { GET, POST } from "@/app/api/v1/brokers/[id]/status-sync/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

async function seedBroker() {
  return prisma.broker.create({
    data: {
      name: "ss",
      endpointUrl: "https://example.com/leads",
      fieldMapping: {} as object,
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
    },
  });
}

describe("POST /api/v1/brokers/{id}/status-sync", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
  });

  it("переключает на polling + требует interval 1..60", async () => {
    const b = await seedBroker();
    const bad = await POST(
      new Request(`http://localhost/api/v1/brokers/${b.id}/status-sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "polling", pollIntervalMin: 120 }),
      }),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(bad.status).toBe(422);

    const ok = await POST(
      new Request(`http://localhost/api/v1/brokers/${b.id}/status-sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "polling",
          pollIntervalMin: 5,
          statusPollPath: "/status",
          statusPollIdsParam: "ids",
        }),
      }),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(ok.status).toBe(200);
    const fresh = await prisma.broker.findUnique({ where: { id: b.id } });
    expect(fresh?.syncMode).toBe("polling");
    expect(fresh?.pollIntervalMin).toBe(5);
  });

  it("переключает обратно на webhook", async () => {
    const b = await seedBroker();
    await prisma.broker.update({
      where: { id: b.id },
      data: { syncMode: "polling", pollIntervalMin: 5 },
    });
    const r = await POST(
      new Request(`http://localhost/api/v1/brokers/${b.id}/status-sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "webhook" }),
      }),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(r.status).toBe(200);
    const fresh = await prisma.broker.findUnique({ where: { id: b.id } });
    expect(fresh?.syncMode).toBe("webhook");
  });

  it("GET возвращает текущую конфигурацию", async () => {
    const b = await seedBroker();
    const r = await GET(
      new Request(`http://localhost/api/v1/brokers/${b.id}/status-sync`),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.mode).toBe("webhook");
  });
});
