import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { cleanupExpiredIdempotency } from "./cleanup-idempotency";

describe("cleanupExpiredIdempotency", () => {
  beforeEach(async () => {
    await resetDb();
    const aff = await prisma.affiliate.create({ data: { name: "x" } });
    const past = new Date(Date.now() - 3600 * 1000);
    const future = new Date(Date.now() + 3600 * 1000);
    await prisma.idempotencyKey.createMany({
      data: [
        {
          key: "expired",
          affiliateId: aff.id,
          responseCode: 202,
          responseBody: {},
          expiresAt: past,
        },
        {
          key: "fresh",
          affiliateId: aff.id,
          responseCode: 202,
          responseBody: {},
          expiresAt: future,
        },
      ],
    });
  });

  it("deletes only expired rows", async () => {
    const deleted = await cleanupExpiredIdempotency();
    expect(deleted).toBe(1);
    const remaining = await prisma.idempotencyKey.findMany();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].key).toBe("fresh");
  });
});
