import { createHash } from "node:crypto";
import { GET, PUT } from "@/app/api/v1/affiliates/[id]/intake-settings/route";
import { POST as postLead } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { invalidateCache, updateIntakeSettings } from "@/server/intake/settings";
import { redis } from "@/server/redis";
import bcryptjs from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN", email: "a@b.com" } }),
}));

describe("intake settings REST", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("GET возвращает defaults", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "s1" } });
    await prisma.user.create({
      data: {
        id: "admin-1",
        email: "a@b.com",
        passwordHash: await bcryptjs.hash("x", 4),
        role: "ADMIN",
      },
    });
    const r = await GET(
      new Request("http://localhost:3000/api/v1/affiliates/x/intake-settings"),
      { params: Promise.resolve({ id: aff.id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.dedupe_window_days).toBe(30);
  });

  it("PUT валидирует max_rpm → 422", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "s2" } });
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const r = await PUT(
      new Request("http://localhost:3000/api/v1/affiliates/x/intake-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ max_rpm: 5 }),
      }),
      { params: Promise.resolve({ id: aff.id }) },
    );
    expect(r.status).toBe(422);
  });

  it("PUT с валидным payload → 200 + version=2", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "s3" } });
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const r = await PUT(
      new Request("http://localhost:3000/api/v1/affiliates/x/intake-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ max_rpm: 500, dedupe_window_days: 14, allowed_geo: ["UA", "DE"] }),
      }),
      { params: Promise.resolve({ id: aff.id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.max_rpm).toBe(500);
    // First PUT = create (upsert → create path, version default 1)
    expect(b.version).toBe(1);

    // Second PUT → update branch → version=2
    const r2 = await PUT(
      new Request("http://localhost:3000/api/v1/affiliates/x/intake-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ max_rpm: 600 }),
      }),
      { params: Promise.resolve({ id: aff.id }) },
    );
    const b2 = await r2.json();
    expect(b2.version).toBe(2);
  });

  it("применяет allowed_geo → отклоняет UA если список=[US]", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "apply" } });
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const rawKey = `ak_ap_${"x".repeat(40)}`;
    await prisma.apiKey.create({
      data: { affiliateId: aff.id, keyHash: sha(rawKey), keyPrefix: rawKey.slice(0, 12), label: "x" },
    });
    await updateIntakeSettings(aff.id, { allowedGeo: ["US"] }, "admin-1");
    invalidateCache();
    await redis.flushdb();

    const r = await postLead(
      new Request("http://localhost:3000/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          geo: "UA",
          ip: "1.1.1.1",
          email: "a@a.com",
          event_ts: new Date().toISOString(),
        }),
      }),
    );
    expect(r.status).toBe(422);
    const b = await r.json();
    expect(b.error.code).toBe("geo_not_allowed");
  });
});
