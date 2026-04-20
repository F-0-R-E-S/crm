import { prisma } from "@/server/db";
import type { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { appRouter } = await import("@/server/routers/_app");

async function makeCtx(role: UserRole) {
  const user = await prisma.user.create({
    data: { email: `${role}-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role },
  });
  return {
    session: { user: { id: user.id, role } },
    prisma,
    userId: user.id,
    role,
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

describe("RBAC redaction (lead list/byId)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("AFFILIATE_VIEWER list omits phone/email/brokerExternalId", async () => {
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        email: "secret@victim.io",
        phone: "+15555550199",
        brokerExternalId: "ext-99",
        eventTs: new Date(),
        traceId: "r1",
      },
    });
    const caller = appRouter.createCaller(await makeCtx("AFFILIATE_VIEWER"));
    const res = await caller.lead.list({ page: 1, pageSize: 10 });
    expect(res.items).toHaveLength(1);
    const row = res.items[0] as Record<string, unknown>;
    expect(row.firstName).not.toBe(undefined); // null firstName also fine
    expect(row.geo).toBe("US");
    expect(row.phone).toBeUndefined();
    expect(row.email).toBeUndefined();
    expect(row.brokerExternalId).toBeUndefined();
  });

  it("ADMIN sees all fields (no redaction)", async () => {
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        email: "x@y.io",
        phone: "+15555550199",
        eventTs: new Date(),
        traceId: "r2",
      },
    });
    const caller = appRouter.createCaller(await makeCtx("ADMIN"));
    const res = await caller.lead.list({ page: 1, pageSize: 10 });
    expect((res.items[0] as Record<string, unknown>).phone).toBe("+15555550199");
    expect((res.items[0] as Record<string, unknown>).email).toBe("x@y.io");
  });
});
