import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { detectDuplicate, isDuplicate } from "./dedup";

const h = (s: string) => createHash("sha256").update(s).digest("hex");

describe("isDuplicate", () => {
  let aff = "";
  beforeEach(async () => {
    const a = await prisma.affiliate.create({ data: { name: "dedup-aff" } });
    aff = a.id;
  });
  afterEach(async () => {
    await prisma.lead.deleteMany({ where: { affiliateId: aff } });
    await prisma.affiliate.delete({ where: { id: aff } });
  });

  it("false when no prior", async () => {
    expect(await isDuplicate(aff, { phoneHash: h("+1"), emailHash: null }, 7)).toBe(false);
  });

  it("true when same phone in window", async () => {
    await prisma.lead.create({
      data: {
        affiliateId: aff,
        geo: "XX",
        ip: "1.1.1.1",
        eventTs: new Date(),
        phoneHash: h("+1"),
        traceId: "t1",
      },
    });
    expect(await isDuplicate(aff, { phoneHash: h("+1"), emailHash: null }, 7)).toBe(true);
  });

  it("false across different affiliates", async () => {
    const other = await prisma.affiliate.create({ data: { name: "other" } });
    await prisma.lead.create({
      data: {
        affiliateId: other.id,
        geo: "XX",
        ip: "1.1.1.1",
        eventTs: new Date(),
        phoneHash: h("+1"),
        traceId: "t2",
      },
    });
    expect(await isDuplicate(aff, { phoneHash: h("+1"), emailHash: null }, 7)).toBe(false);
    await prisma.lead.deleteMany({ where: { affiliateId: other.id } });
    await prisma.affiliate.delete({ where: { id: other.id } });
  });
});

describe("detectDuplicate — strategies", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("external_lead_id exact match в окне", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "d" } });
    const first = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        externalLeadId: "EXT-1",
        geo: "UA",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "t1",
      },
    });
    const r = await detectDuplicate({
      affiliateId: aff.id,
      externalLeadId: "EXT-1",
      phoneHash: null,
      emailHash: null,
      fingerprint: null,
      windowDays: 30,
      crossAffiliate: false,
    });
    expect(r).toMatchObject({
      duplicate: true,
      matchedBy: "external_lead_id",
      existingLeadId: first.id,
      confidence: "high",
    });
  });

  it("phone_hash match без external_lead_id", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "d2" } });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        phoneHash: "HPH",
        geo: "UA",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "t2",
      },
    });
    const r = await detectDuplicate({
      affiliateId: aff.id,
      externalLeadId: null,
      phoneHash: "HPH",
      emailHash: null,
      fingerprint: null,
      windowDays: 30,
      crossAffiliate: false,
    });
    expect(r.duplicate).toBe(true);
    if (r.duplicate) expect(r.matchedBy).toBe("phone_hash");
  });

  it("не дубль при crossAffiliate=false и другом affiliate", async () => {
    const a1 = await prisma.affiliate.create({ data: { name: "a1" } });
    const a2 = await prisma.affiliate.create({ data: { name: "a2" } });
    await prisma.lead.create({
      data: {
        affiliateId: a1.id,
        phoneHash: "SHARED",
        geo: "UA",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "ta1",
      },
    });
    const r = await detectDuplicate({
      affiliateId: a2.id,
      externalLeadId: null,
      phoneHash: "SHARED",
      emailHash: null,
      fingerprint: null,
      windowDays: 30,
      crossAffiliate: false,
    });
    expect(r.duplicate).toBe(false);
  });
});
