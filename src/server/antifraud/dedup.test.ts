import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isDuplicate } from "./dedup";

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
