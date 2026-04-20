import { prisma } from "@/server/db";
import type { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

// next-auth's import of "next/server" trips Node-env tests. Mock before appRouter import.
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { appRouter } = await import("@/server/routers/_app");

async function makeCtx(role: UserRole = "OPERATOR") {
  const user = await prisma.user.create({
    data: { email: `u-${Date.now()}-${Math.random()}@t.io`, passwordHash: "x", role },
  });
  // Shape matches createTRPCContext() + what protectedProcedure unwraps.
  return {
    session: { user: { id: user.id, role } },
    prisma,
    userId: user.id,
    role,
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

describe("manualReview router", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("list returns open queue entries ordered by createdAt desc", async () => {
    const c = await makeCtx();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
    });
    const l1 = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "a",
      },
    });
    const l2 = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "b",
      },
    });
    await prisma.manualReviewQueue.create({ data: { leadId: l1.id, reason: "BROKER_FAILED" } });
    await prisma.manualReviewQueue.create({ data: { leadId: l2.id, reason: "CAP_REACHED" } });

    const caller = appRouter.createCaller(c);
    const res = await caller.manualReview.list({ status: "OPEN", cursor: null, take: 50 });
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].reason).toBeDefined();
  });

  it("claim sets claimedBy and claimedAt", async () => {
    const c = await makeCtx();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    const l = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "c",
      },
    });
    const mrq = await prisma.manualReviewQueue.create({
      data: { leadId: l.id, reason: "BROKER_FAILED" },
    });

    const caller = appRouter.createCaller(c);
    await caller.manualReview.claim({ id: mrq.id });
    const after = await prisma.manualReviewQueue.findUnique({ where: { id: mrq.id } });
    expect(after?.claimedBy).toBe((c as unknown as { userId: string }).userId);
    expect(after?.claimedAt).not.toBeNull();
  });

  it("resolve sets resolution and bumps Lead.state for ACCEPT", async () => {
    const c = await makeCtx();
    const aff = await prisma.affiliate.create({ data: { name: "t", contactEmail: "t@t.io" } });
    const l = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "d",
        state: "FAILED",
      },
    });
    const mrq = await prisma.manualReviewQueue.create({
      data: { leadId: l.id, reason: "BROKER_FAILED" },
    });

    const caller = appRouter.createCaller(c);
    await caller.manualReview.resolve({
      id: mrq.id,
      resolution: "ACCEPT",
      note: "verified by ops",
    });
    const after = await prisma.manualReviewQueue.findUnique({ where: { id: mrq.id } });
    expect(after?.resolution).toBe("ACCEPT");
    expect(after?.resolvedBy).toBe((c as unknown as { userId: string }).userId);
    expect(after?.resolvedAt).not.toBeNull();
    const lead = await prisma.lead.findUnique({ where: { id: l.id } });
    expect(lead?.state).toBe("ACCEPTED");
  });

  it("requeue re-enqueues push-lead and clears the row", async () => {
    const c = await makeCtx();
    const aff = await prisma.affiliate.create({ data: { name: "t", contactEmail: "t@t.io" } });
    const l = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "e",
        state: "FAILED",
      },
    });
    const mrq = await prisma.manualReviewQueue.create({
      data: { leadId: l.id, reason: "BROKER_FAILED" },
    });

    const caller = appRouter.createCaller(c);
    await caller.manualReview.requeue({ id: mrq.id });
    const after = await prisma.manualReviewQueue.findUnique({ where: { id: mrq.id } });
    expect(after?.resolution).toBe("REQUEUE");
    const lead = await prisma.lead.findUnique({ where: { id: l.id } });
    expect(lead?.state).toBe("NEW");
  });
});
