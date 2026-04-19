import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyApiKey } from "./auth-api-key";
import { prisma } from "./db";

describe("verifyApiKey", () => {
  const rawKey = `ak_unittest_${"x".repeat(40)}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  let affiliateId = "";

  beforeEach(async () => {
    const aff = await prisma.affiliate.create({ data: { name: "Unit Test Aff" } });
    affiliateId = aff.id;
    await prisma.apiKey.create({
      data: { affiliateId, keyHash, keyPrefix: rawKey.slice(0, 12), label: "test" },
    });
  });
  afterEach(async () => {
    await prisma.apiKey.deleteMany({ where: { affiliateId } });
    await prisma.affiliate.delete({ where: { id: affiliateId } });
  });

  it("resolves valid key", async () => {
    const res = await verifyApiKey(`Bearer ${rawKey}`);
    expect(res?.affiliateId).toBe(affiliateId);
  });

  it("returns null on wrong key", async () => {
    expect(await verifyApiKey("Bearer bogus")).toBeNull();
  });

  it("returns null on revoked key", async () => {
    await prisma.apiKey.updateMany({ where: { keyHash }, data: { isRevoked: true } });
    expect(await verifyApiKey(`Bearer ${rawKey}`)).toBeNull();
  });

  it("returns null when missing Bearer prefix", async () => {
    expect(await verifyApiKey(rawKey)).toBeNull();
  });
});
