import { GET, PUT } from "@/app/api/v1/brokers/[id]/mapping/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

async function seedBroker() {
  const tpl = await prisma.brokerTemplate.create({
    data: {
      slug: "tpl-m",
      name: "TplM",
      vendor: "V",
      vertical: "forex",
      protocol: "rest-json",
      status: "active",
      countries: ["UA"],
      fieldMapping: {},
      requiredFields: ["first_name", "email", "country"],
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
      statusMapping: {},
      samplePayload: { first_name: "J", email: "j@x.com", country: "UA" },
    },
  });
  const b = await prisma.broker.create({
    data: {
      name: "B-m",
      templateId: tpl.id,
      endpointUrl: "https://example.com",
      fieldMapping: {},
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
    },
  });
  return { broker: b, template: tpl };
}

describe("PUT /api/v1/brokers/{id}/mapping", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
  });

  it("422 required_field_missing если mapping не покрывает required", async () => {
    const { broker } = await seedBroker();
    const r = await PUT(
      new Request(`http://localhost/api/v1/brokers/${broker.id}/mapping`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mapping: { firstName: { target: "first_name" } },
          staticPayload: {},
        }),
      }),
      { params: Promise.resolve({ id: broker.id }) },
    );
    expect(r.status).toBe(422);
    const b = await r.json();
    expect(b.error.code).toBe("required_field_missing");
    expect(b.error.missing).toContain("email");
    expect(b.error.missing).toContain("country");
  });

  it("200 сохраняет mapping + staticPayload", async () => {
    const { broker } = await seedBroker();
    const r = await PUT(
      new Request(`http://localhost/api/v1/brokers/${broker.id}/mapping`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mapping: {
            firstName: { target: "first_name" },
            email: { target: "email" },
            geo: { target: "country", transform: "uppercase" },
          },
          staticPayload: { source: "gc" },
        }),
      }),
      { params: Promise.resolve({ id: broker.id }) },
    );
    expect(r.status).toBe(200);
    const fresh = await prisma.broker.findUnique({ where: { id: broker.id } });
    expect(fresh?.staticPayload).toEqual({ source: "gc" });
  });

  it("GET preview возвращает маскированный payload на sample lead", async () => {
    const { broker } = await seedBroker();
    await prisma.broker.update({
      where: { id: broker.id },
      data: {
        fieldMapping: {
          firstName: { target: "first_name" },
          lastName: { target: "last_name" },
          email: { target: "email" },
          phone: { target: "phone", transform: "format_phone" },
          geo: { target: "country", transform: "uppercase" },
          ip: { target: "ip" },
        } as object,
        staticPayload: { source: "gc" } as object,
      },
    });
    const r = await GET(
      new Request(`http://localhost/api/v1/brokers/${broker.id}/mapping?preview=1`),
      { params: Promise.resolve({ id: broker.id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.preview.last_name).toMatch(/\*\*\*/);
    expect(b.preview.email).toMatch(/@/);
    expect(b.preview.email).toMatch(/\*/);
    expect(b.preview.source).toBe("gc");
    expect(b.required_fields).toBeDefined();
  });
});
