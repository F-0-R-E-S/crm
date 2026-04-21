import { CLONE_BLANKED_FIELDS, cloneBroker } from "@/server/brokers/clone";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function seedSourceBroker() {
  return prisma.broker.create({
    data: {
      name: "Source Broker",
      isActive: true,
      dailyCap: 500,
      workingHours: { mon: "09:00-17:00" },
      endpointUrl: "https://source.example.com/leads",
      httpMethod: "POST",
      headers: { "x-source": "true" },
      authType: "BEARER",
      authConfig: { token: "super-secret-token" },
      fieldMapping: { firstName: "first_name", lastName: "last_name" },
      staticPayload: { campaign: "seed" },
      responseIdPath: "id",
      postbackSecret: "src-postback-secret",
      postbackLeadIdPath: "lead_id",
      postbackStatusPath: "status",
      statusMapping: { accepted: "ACCEPTED" },
      syncMode: "polling",
      pollIntervalMin: 5,
      retrySchedule: "10,60,300",
      pendingHoldMinutes: 15,
      autologinEnabled: true,
      autologinLoginUrl: "https://source.example.com/login",
      lastHealthStatus: "healthy",
      lastHealthCheckAt: new Date(),
    },
  });
}

describe("cloneBroker", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates a new row with clonedFromId and copies whitelisted config", async () => {
    const src = await seedSourceBroker();
    const clone = await cloneBroker({ sourceId: src.id, newName: "Source Broker (clone)" });

    expect(clone.id).not.toBe(src.id);
    expect(clone.clonedFromId).toBe(src.id);
    expect(clone.name).toBe("Source Broker (clone)");
    // copied
    expect(clone.dailyCap).toBe(src.dailyCap);
    expect(clone.httpMethod).toBe(src.httpMethod);
    expect(clone.authType).toBe(src.authType);
    expect(clone.syncMode).toBe(src.syncMode);
    expect(clone.pollIntervalMin).toBe(src.pollIntervalMin);
    expect(clone.retrySchedule).toBe(src.retrySchedule);
    expect(clone.pendingHoldMinutes).toBe(src.pendingHoldMinutes);
    expect(clone.autologinEnabled).toBe(src.autologinEnabled);
    expect(clone.responseIdPath).toBe(src.responseIdPath);
    expect(clone.postbackLeadIdPath).toBe(src.postbackLeadIdPath);
    expect(clone.postbackStatusPath).toBe(src.postbackStatusPath);
    expect(clone.headers).toEqual(src.headers);
    expect(clone.fieldMapping).toEqual(src.fieldMapping);
    expect(clone.staticPayload).toEqual(src.staticPayload);
    expect(clone.workingHours).toEqual(src.workingHours);
    expect(clone.statusMapping).toEqual(src.statusMapping);
  });

  it("blanks credential/endpoint fields", async () => {
    const src = await seedSourceBroker();
    const clone = await cloneBroker({ sourceId: src.id, newName: "c1" });

    expect(clone.endpointUrl).toBe("");
    expect(clone.postbackSecret).toBe("");
    expect(clone.authConfig).toEqual({});
    expect(clone.autologinLoginUrl).toBeNull();

    // sanity: each blanked key lists one of the above
    for (const key of CLONE_BLANKED_FIELDS) {
      expect(clone[key as keyof typeof clone]).toBeDefined();
    }
  });

  it("resets health state + starts clone paused", async () => {
    const src = await seedSourceBroker();
    const clone = await cloneBroker({ sourceId: src.id, newName: "c2" });
    expect(clone.isActive).toBe(false);
    expect(clone.lastHealthStatus).toBe("unknown");
    expect(clone.lastHealthCheckAt).toBeNull();
    expect(clone.lastPolledAt).toBeNull();
  });

  it("cloned row is queryable via clonedFromId and via reverse relation", async () => {
    const src = await seedSourceBroker();
    const c1 = await cloneBroker({ sourceId: src.id, newName: "c1" });
    const c2 = await cloneBroker({ sourceId: src.id, newName: "c2" });

    const byFromId = await prisma.broker.findMany({
      where: { clonedFromId: src.id },
      orderBy: { createdAt: "asc" },
    });
    expect(byFromId.map((b) => b.id).sort()).toEqual([c1.id, c2.id].sort());

    const withClones = await prisma.broker.findUnique({
      where: { id: src.id },
      include: { clones: true, clonedFrom: true },
    });
    expect(withClones?.clones.length).toBe(2);
    expect(withClones?.clonedFrom).toBeNull();

    const cloneWithParent = await prisma.broker.findUnique({
      where: { id: c1.id },
      include: { clonedFrom: true },
    });
    expect(cloneWithParent?.clonedFrom?.id).toBe(src.id);
  });
});
