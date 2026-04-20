import { GET as getCaps } from "@/app/api/v1/routing/caps/[flowId]/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { consumeCap } from "@/server/routing/constraints/caps";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "u1", role: "ADMIN" } }),
}));

describe("caps concurrent + REST", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("100 concurrent INCR с limit=10 дают ровно 10 успешных", async () => {
    const base = {
      scope: "BROKER" as const,
      scopeId: "b1",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 10,
      now: new Date("2026-04-20T10:00:00Z"),
    };
    const results = await Promise.all(Array.from({ length: 100 }, () => consumeCap(base)));
    const ok = results.filter((r) => r.ok).length;
    expect(ok).toBe(10);
  });

  it("GET /caps/{flowId} возвращает used/remaining/resets_at", async () => {
    const flow = await prisma.flow.create({ data: { name: "T", timezone: "UTC" } });
    const fv = await prisma.flowVersion.create({
      data: { flowId: flow.id, versionNumber: 1, graph: {}, algorithm: {} },
    });
    await prisma.flow.update({
      where: { id: flow.id },
      data: { activeVersionId: fv.id, status: "PUBLISHED" },
    });
    await prisma.capDefinition.create({
      data: {
        flowVersionId: fv.id,
        scope: "BROKER",
        scopeRefId: "b1",
        window: "DAILY",
        limit: 100,
        timezone: "UTC",
      },
    });
    await consumeCap({
      scope: "BROKER",
      scopeId: "b1",
      window: "DAILY",
      tz: "UTC",
      limit: 100,
    });

    const r = await getCaps(new Request(`http://x/api/v1/routing/caps/${flow.id}`), {
      params: Promise.resolve({ flowId: flow.id }),
    });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.caps[0].used).toBe(1);
    expect(b.caps[0].remaining).toBe(99);
    expect(b.caps[0].resets_at).toBeTruthy();
  });
});
