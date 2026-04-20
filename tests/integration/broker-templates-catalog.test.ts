import { GET as byIdGET } from "@/app/api/v1/brokers/templates/[templateId]/route";
import { GET as listGET } from "@/app/api/v1/brokers/templates/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

describe("GET /api/v1/brokers/templates", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    await prisma.brokerTemplate.createMany({
      data: [
        {
          slug: "t-forex-1",
          name: "Forex One",
          vendor: "V1",
          vertical: "forex",
          protocol: "rest-json",
          status: "active",
          countries: ["UA"],
          fieldMapping: {},
          requiredFields: [],
          postbackLeadIdPath: "$.id",
          postbackStatusPath: "$.s",
          statusMapping: {},
          samplePayload: {},
        },
        {
          slug: "t-crypto-1",
          name: "Crypto One",
          vendor: "V2",
          vertical: "crypto",
          protocol: "rest-json",
          status: "active",
          countries: ["DE"],
          fieldMapping: {},
          requiredFields: [],
          postbackLeadIdPath: "$.id",
          postbackStatusPath: "$.s",
          statusMapping: {},
          samplePayload: {},
        },
      ],
    });
  });

  it("200 и фильтрует по vertical", async () => {
    const r = await listGET(
      new Request("http://localhost/api/v1/brokers/templates?vertical=forex"),
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.total).toBe(1);
    expect(b.items[0].slug).toBe("t-forex-1");
  });

  it("422 при unknown sort_by", async () => {
    const r = await listGET(new Request("http://localhost/api/v1/brokers/templates?sort_by=wrong"));
    expect(r.status).toBe(422);
  });

  it("GET by id возвращает template + sample_payload", async () => {
    const t = await prisma.brokerTemplate.findFirst({ where: { slug: "t-forex-1" } });
    if (!t) throw new Error("seed missing");
    const r = await byIdGET(new Request(`http://localhost/api/v1/brokers/templates/${t.id}`), {
      params: Promise.resolve({ templateId: t.id }),
    });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.slug).toBe("t-forex-1");
    expect(b.sample_payload).toBeDefined();
  });

  it("GET by id — 404 если нет", async () => {
    const r = await byIdGET(new Request("http://localhost/api/v1/brokers/templates/nope"), {
      params: Promise.resolve({ templateId: "nope" }),
    });
    expect(r.status).toBe(404);
  });
});
