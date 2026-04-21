import { prisma } from "@/server/db";
import { applyScheduledChange } from "@/server/scheduled-changes/orchestrator";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("scheduled change cancel", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("worker skips CANCELLED rows and does not touch the entity", async () => {
    const b = await prisma.broker.create({
      data: {
        name: "t",
        endpointUrl: "https://t.test",
        fieldMapping: { firstName: "first_name" },
        postbackSecret: "s",
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        isActive: true,
      },
    });
    const u = await prisma.user.create({
      data: { email: `u-${Date.now()}@t.io`, passwordHash: "x", role: "ADMIN" },
    });
    const sc = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: b.id,
        payload: { isActive: false },
        applyAt: new Date(Date.now() - 5_000),
        createdBy: u.id,
        status: "CANCELLED",
      },
    });
    const res = await applyScheduledChange(sc.id);
    expect(res.status).toBe("SKIPPED");
    const after = await prisma.broker.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.isActive).toBe(true);
  });
});
