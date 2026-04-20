import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { getTemplateById, listTemplates } from "./catalog";

describe("broker-template catalog", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.brokerTemplate.createMany({
      data: [
        {
          slug: "forex-alpha",
          name: "Alpha Forex CRM",
          vendor: "Alpha",
          vertical: "forex",
          protocol: "rest-json",
          status: "active",
          countries: ["UA", "PL"],
          fieldMapping: { firstName: "first_name", email: "email" },
          requiredFields: ["first_name", "email"],
          postbackLeadIdPath: "$.lead_id",
          postbackStatusPath: "$.status",
          statusMapping: { new: "NEW", ftd: "FTD" },
          samplePayload: { first_name: "John", email: "john@x.com" },
        },
        {
          slug: "crypto-beta",
          name: "Beta Crypto CRM",
          vendor: "Beta",
          vertical: "crypto",
          protocol: "rest-json",
          status: "active",
          countries: ["DE"],
          fieldMapping: {},
          requiredFields: [],
          postbackLeadIdPath: "$.id",
          postbackStatusPath: "$.state",
          statusMapping: {},
          samplePayload: {},
        },
        {
          slug: "gambl-gamma",
          name: "Gamma Gamble",
          vendor: "Gamma",
          vertical: "gambling",
          protocol: "soap",
          status: "deprecated",
          countries: ["UK"],
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

  it("фильтрует по vertical=forex", async () => {
    const res = await listTemplates({ vertical: "forex" });
    expect(res.total).toBe(1);
    expect(res.items[0].slug).toBe("forex-alpha");
  });

  it("фильтрует по country (array contains)", async () => {
    const res = await listTemplates({ country: "PL" });
    expect(res.items.map((t) => t.slug)).toContain("forex-alpha");
    expect(res.items.find((t) => t.slug === "crypto-beta")).toBeUndefined();
  });

  it("фильтрует по protocol=rest-json", async () => {
    const res = await listTemplates({ protocol: "rest-json" });
    expect(res.total).toBe(2);
  });

  it("фильтрует по status=active (default)", async () => {
    const res = await listTemplates({});
    expect(res.items.find((t) => t.slug === "gambl-gamma")).toBeUndefined();
  });

  it("поиск по имени case-insensitive", async () => {
    const res = await listTemplates({ q: "ALPHA" });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].slug).toBe("forex-alpha");
  });

  it("пагинация — limit 2, offset 0, sort name asc", async () => {
    const res = await listTemplates({ status: "active", limit: 2, offset: 0 });
    expect(res.items).toHaveLength(2);
    expect(res.items[0].name <= res.items[1].name).toBe(true);
    expect(res.total).toBe(2);
  });

  it("getTemplateById возвращает record или null", async () => {
    const first = await prisma.brokerTemplate.findFirst();
    if (!first) throw new Error("seed missing");
    const t = await getTemplateById(first.id);
    expect(t?.slug).toBe(first.slug);
    expect(await getTemplateById("nope")).toBeNull();
  });
});
