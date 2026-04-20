import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { handleResolvePendingHold } from "./resolve-pending-hold";

async function createLead(state: "PENDING_HOLD" | "ACCEPTED" | "DECLINED" | "FTD") {
  const affiliate = await prisma.affiliate.create({ data: { name: "test" } });
  return prisma.lead.create({
    data: {
      affiliateId: affiliate.id,
      state,
      geo: "DE",
      ip: "1.2.3.4",
      eventTs: new Date(),
      traceId: `trace-${Date.now()}-${Math.random()}`,
      pendingHoldUntil: state === "PENDING_HOLD" ? new Date(Date.now() + 60_000) : null,
    },
  });
}

describe("resolve-pending-hold", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("лид в PENDING_HOLD → переводится в ACCEPTED + LeadEvent PENDING_HOLD_RELEASED", async () => {
    const lead = await createLead("PENDING_HOLD");
    await handleResolvePendingHold({ leadId: lead.id });
    const after = await prisma.lead.findUnique({ where: { id: lead.id } });
    const events = await prisma.leadEvent.findMany({ where: { leadId: lead.id } });
    expect(after?.state).toBe("ACCEPTED");
    expect(after?.acceptedAt).not.toBeNull();
    expect(after?.pendingHoldUntil).toBeNull();
    expect(events.some((e) => e.kind === "PENDING_HOLD_RELEASED")).toBe(true);
  });

  it("лид уже в ACCEPTED/DECLINED/FTD → no-op", async () => {
    for (const state of ["ACCEPTED", "DECLINED", "FTD"] as const) {
      const lead = await createLead(state);
      const before = await prisma.lead.findUnique({ where: { id: lead.id } });
      await handleResolvePendingHold({ leadId: lead.id });
      const after = await prisma.lead.findUnique({ where: { id: lead.id } });
      expect(after?.state).toBe(before?.state);
    }
  });

  it("отсутствующий лид → no-op без исключения", async () => {
    await expect(handleResolvePendingHold({ leadId: "does-not-exist" })).resolves.toBeUndefined();
  });
});
