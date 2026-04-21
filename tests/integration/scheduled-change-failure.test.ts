import { prisma } from "@/server/db";
import { applyScheduledChange } from "@/server/scheduled-changes/orchestrator";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("scheduled change failures", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("disallowed field → FAILED with errorMessage", async () => {
    const b = await prisma.broker.create({
      data: {
        name: "t",
        endpointUrl: "https://t.test",
        fieldMapping: { firstName: "first_name" },
        postbackSecret: "s",
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
      },
    });
    const u = await prisma.user.create({
      data: { email: `u-${Date.now()}@t.io`, passwordHash: "x", role: "ADMIN" },
    });
    const sc = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: b.id,
        payload: { endpointUrl: "https://evil.example.com" },
        applyAt: new Date(Date.now() - 100),
        createdBy: u.id,
      },
    });
    const res = await applyScheduledChange(sc.id);
    expect(res.status).toBe("FAILED");
    const row = await prisma.scheduledChange.findUniqueOrThrow({ where: { id: sc.id } });
    expect(row.status).toBe("FAILED");
    expect(row.errorMessage).toMatch(/disallowed_field/);
    expect(row.errorMessage).toMatch(/endpointUrl/);

    const after = await prisma.broker.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.endpointUrl).toBe("https://t.test"); // unchanged

    const logs = await prisma.auditLog.findMany({
      where: { action: "scheduled_change_failed", entityId: sc.id },
    });
    expect(logs).toHaveLength(1);
  });

  it("missing entity → FAILED", async () => {
    const u = await prisma.user.create({
      data: { email: `u-${Date.now()}@t.io`, passwordHash: "x", role: "ADMIN" },
    });
    const sc = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: "nonexistent-id",
        payload: { isActive: false },
        applyAt: new Date(Date.now() - 100),
        createdBy: u.id,
      },
    });
    const res = await applyScheduledChange(sc.id);
    expect(res.status).toBe("FAILED");
    const row = await prisma.scheduledChange.findUniqueOrThrow({ where: { id: sc.id } });
    expect(row.errorMessage).toBeTruthy();
  });
});
