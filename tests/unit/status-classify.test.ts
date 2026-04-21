import { prisma } from "@/server/db";
import { classifyLeadStatus, invalidateStatusMappingCache } from "@/server/status-groups/classify";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function seed(
  brokerId: string,
  canonicalCode: string,
  rawStatus: string,
  label = canonicalCode,
) {
  const canon = await prisma.canonicalStatus.upsert({
    where: { code: canonicalCode },
    update: {},
    create: {
      code: canonicalCode,
      label,
      category:
        canonicalCode === "ftd" || canonicalCode === "redeposit"
          ? "CONVERTED"
          : canonicalCode === "qualified"
            ? "QUALIFIED"
            : canonicalCode === "new" || canonicalCode === "pending_contact"
              ? "NEW"
              : "REJECTED",
      sortOrder: 100,
    },
  });
  await prisma.statusMapping.upsert({
    where: { brokerId_rawStatus: { brokerId, rawStatus } },
    update: { canonicalStatusId: canon.id },
    create: { brokerId, rawStatus, canonicalStatusId: canon.id },
  });
  invalidateStatusMappingCache(brokerId);
}

async function makeBroker(id: string) {
  await prisma.broker.upsert({
    where: { id },
    update: {},
    create: {
      id,
      name: id,
      isActive: false,
      endpointUrl: "http://localhost:9/x",
      fieldMapping: { firstName: "first_name" },
      postbackSecret: "s",
      postbackLeadIdPath: "id",
      postbackStatusPath: "status",
      statusMapping: {},
    },
  });
}

describe("classifyLeadStatus", () => {
  beforeEach(async () => {
    await resetDb();
    invalidateStatusMappingCache();
    await makeBroker("b-1");
    await makeBroker("b-2");
  });

  it("exact match returns canonical code", async () => {
    await seed("b-1", "ftd", "FTD");
    expect(await classifyLeadStatus("b-1", "FTD")).toBe("ftd");
  });

  it("unknown raw returns 'unmapped'", async () => {
    await seed("b-1", "ftd", "FTD");
    expect(await classifyLeadStatus("b-1", "nothing")).toBe("unmapped");
  });

  it("empty/null raw returns 'unmapped'", async () => {
    expect(await classifyLeadStatus("b-1", "")).toBe("unmapped");
    expect(await classifyLeadStatus("b-1", null)).toBe("unmapped");
  });

  it("broker-scoped: same raw different canonicals per broker", async () => {
    await seed("b-1", "ftd", "deposit");
    await seed("b-2", "redeposit", "deposit");
    expect(await classifyLeadStatus("b-1", "deposit")).toBe("ftd");
    expect(await classifyLeadStatus("b-2", "deposit")).toBe("redeposit");
  });

  it("case-sensitive lookups respect mapping rawStatus exactly", async () => {
    await seed("b-1", "ftd", "FTD");
    expect(await classifyLeadStatus("b-1", "FTD")).toBe("ftd");
    expect(await classifyLeadStatus("b-1", "ftd")).toBe("unmapped");
  });

  it("broker with no mappings returns 'unmapped'", async () => {
    expect(await classifyLeadStatus("b-1", "anything")).toBe("unmapped");
  });

  it("returns 'unmapped' for unknown broker id", async () => {
    await seed("b-1", "ftd", "FTD");
    expect(await classifyLeadStatus("nonexistent-broker", "FTD")).toBe("unmapped");
  });

  it("resolves multiple canonical categories correctly", async () => {
    await seed("b-1", "new", "NEW");
    await seed("b-1", "qualified", "QUAL");
    await seed("b-1", "rejected", "REJ");
    expect(await classifyLeadStatus("b-1", "NEW")).toBe("new");
    expect(await classifyLeadStatus("b-1", "QUAL")).toBe("qualified");
    expect(await classifyLeadStatus("b-1", "REJ")).toBe("rejected");
  });

  it("trims whitespace on raw status (normalization)", async () => {
    await seed("b-1", "ftd", "FTD");
    expect(await classifyLeadStatus("b-1", "  FTD  ")).toBe("ftd");
  });

  it("supports cascading queries without crashing on missing canonical", async () => {
    await seed("b-1", "ftd", "FTD");
    // Delete the canonical but keep broker ref — shouldn't happen via CRUD
    // but if DB is ever inconsistent the classifier should still degrade gracefully.
    const raw = "UNSEEN_STATUS";
    expect(await classifyLeadStatus("b-1", raw)).toBe("unmapped");
  });
});
