import { POST } from "@/app/api/v1/brokers/[id]/test-connection/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

async function seedBroker(url = "https://example.com/x") {
  const b = await prisma.broker.create({
    data: {
      name: "tc",
      endpointUrl: url,
      fieldMapping: { firstName: { target: "first_name" } } as object,
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
    },
  });
  return b;
}

describe("POST /api/v1/brokers/{id}/test-connection", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
  });

  it("200 ok + пишет BrokerHealthCheck", async () => {
    const b = await seedBroker();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ lead_id: "x" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const r = await POST(
      new Request(`http://localhost/api/v1/brokers/${b.id}/test-connection`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.auth_status).toBe("ok");
    expect(typeof body.latency_ms).toBe("number");
    expect(body.sample_response).toBeDefined();
    expect(body.sample_payload_masked).toBeDefined();
    const checks = await prisma.brokerHealthCheck.findMany({ where: { brokerId: b.id } });
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("ok");
  });

  it("504 broker_timeout при timeout", async () => {
    const b = await seedBroker();
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      (_, init) =>
        new Promise((_, reject) => {
          (init?.signal as AbortSignal).addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          );
        }),
    );
    const r = await POST(
      new Request(`http://localhost/api/v1/brokers/${b.id}/test-connection?timeout_ms=50`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: b.id }) },
    );
    expect(r.status).toBe(504);
    const body = await r.json();
    expect(body.error?.code).toBe("broker_timeout");
  });

  it("404 broker_not_found", async () => {
    const r = await POST(
      new Request("http://localhost/api/v1/brokers/none/test-connection", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "none" }) },
    );
    expect(r.status).toBe(404);
  });
});
