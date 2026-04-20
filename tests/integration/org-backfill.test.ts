import { backfillDefaultOrg } from "@/server/onboarding/backfill";
import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("backfillDefaultOrg", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates one Default Org and attaches all existing users to it", async () => {
    const hash = await bcrypt.hash("secret", 4);
    await prisma.user.createMany({
      data: [
        { email: "u1@x.io", passwordHash: hash, role: "OPERATOR" },
        { email: "u2@x.io", passwordHash: hash, role: "OPERATOR" },
      ],
    });

    const orgId = await backfillDefaultOrg();

    const org = await prisma.org.findUnique({ where: { id: orgId } });
    expect(org?.slug).toBe("default");

    const users = await prisma.user.findMany({ orderBy: { email: "asc" } });
    expect(users).toHaveLength(2);
    for (const u of users) {
      expect(u.orgId).toBe(orgId);
    }
  });

  it("is idempotent — re-run does not duplicate the default org", async () => {
    const first = await backfillDefaultOrg();
    const second = await backfillDefaultOrg();
    expect(first).toBe(second);
    const count = await prisma.org.count({ where: { slug: "default" } });
    expect(count).toBe(1);
  });
});
