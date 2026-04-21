import { prisma } from "@/server/db";
import {
  applyDueScheduledChanges,
  applyScheduledChange,
} from "@/server/scheduled-changes/orchestrator";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function seedBroker() {
  return prisma.broker.create({
    data: {
      name: "target",
      endpointUrl: "https://target.example.com",
      fieldMapping: { firstName: "first_name" },
      postbackSecret: "s",
      postbackLeadIdPath: "lead_id",
      postbackStatusPath: "status",
      isActive: true,
      dailyCap: 100,
    },
  });
}

async function seedUser() {
  return prisma.user.create({
    data: { email: `u-${Date.now()}@t.io`, passwordHash: "x", role: "ADMIN" },
  });
}

describe("applyScheduledChange — Broker patch", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("applies a Broker patch and marks APPLIED", async () => {
    const b = await seedBroker();
    const u = await seedUser();
    const past = new Date(Date.now() - 30_000);
    const sc = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: b.id,
        payload: { isActive: false, dailyCap: 50 },
        applyAt: past,
        createdBy: u.id,
      },
    });

    const res = await applyScheduledChange(sc.id);
    expect(res.status).toBe("APPLIED");
    expect(res.latencyMs).toBeGreaterThanOrEqual(30_000);

    const after = await prisma.broker.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.isActive).toBe(false);
    expect(after.dailyCap).toBe(50);

    const sc2 = await prisma.scheduledChange.findUniqueOrThrow({ where: { id: sc.id } });
    expect(sc2.status).toBe("APPLIED");
    expect(sc2.appliedAt).toBeInstanceOf(Date);
    expect(sc2.errorMessage).toBeNull();

    const logs = await prisma.auditLog.findMany({
      where: { action: "scheduled_change_applied", entityId: sc.id },
    });
    expect(logs).toHaveLength(1);
  });

  it("is idempotent on a non-PENDING row", async () => {
    const b = await seedBroker();
    const u = await seedUser();
    const sc = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: b.id,
        payload: { isActive: false },
        applyAt: new Date(Date.now() - 1000),
        createdBy: u.id,
        status: "CANCELLED",
      },
    });
    const res = await applyScheduledChange(sc.id);
    expect(res.status).toBe("SKIPPED");
    const after = await prisma.broker.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.isActive).toBe(true); // untouched
  });

  it("applyDueScheduledChanges processes multiple due rows, skips future ones", async () => {
    const b = await seedBroker();
    const u = await seedUser();
    const now = Date.now();
    await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: b.id,
        payload: { dailyCap: 10 },
        applyAt: new Date(now - 10_000),
        createdBy: u.id,
      },
    });
    const future = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: b.id,
        payload: { dailyCap: 99 },
        applyAt: new Date(now + 60_000),
        createdBy: u.id,
      },
    });

    const summary = await applyDueScheduledChanges(new Date(now));
    expect(summary.processed).toBe(1);
    expect(summary.applied).toBe(1);

    const after = await prisma.broker.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.dailyCap).toBe(10);

    const futureAfter = await prisma.scheduledChange.findUniqueOrThrow({
      where: { id: future.id },
    });
    expect(futureAfter.status).toBe("PENDING");
  });
});
