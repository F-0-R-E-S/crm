import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1", email: "u@t.io", role: "ADMIN" } })),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { GET: listShares, DELETE: deleteExpired } = await import(
  "@/app/api/v1/analytics/share/route"
);

describe("GET /api/v1/analytics/share (list) + DELETE (purge expired)", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "u1", email: "u@t.io", passwordHash: "x", role: "ADMIN" },
    });
  });

  it("lists share links owned by the caller with expiry metadata", async () => {
    await prisma.analyticsShareLink.createMany({
      data: [
        {
          token: "a".repeat(32),
          query: { proc: "metricSeries" },
          createdBy: "u1",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
        {
          token: "b".repeat(32),
          query: { proc: "metricSeries" },
          createdBy: "u1",
          expiresAt: new Date(Date.now() - 1000),
        },
        {
          token: "c".repeat(32),
          query: { proc: "metricSeries" },
          createdBy: "other",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      ],
    });
    const res = await listShares(new Request("http://localhost/api/v1/analytics/share"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      links: Array<{ token: string; expiresAt: string; expired: boolean }>;
    };
    // Only "u1" links
    expect(json.links.map((l) => l.token).sort()).toEqual(["a".repeat(32), "b".repeat(32)]);
    const expired = json.links.find((l) => l.token === "b".repeat(32));
    expect(expired?.expired).toBe(true);
  });

  it("DELETE purges expired links for the caller only", async () => {
    await prisma.analyticsShareLink.createMany({
      data: [
        {
          token: "a".repeat(32),
          query: {},
          createdBy: "u1",
          expiresAt: new Date(Date.now() - 5000),
        },
        {
          token: "b".repeat(32),
          query: {},
          createdBy: "u1",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
        {
          token: "c".repeat(32),
          query: {},
          createdBy: "other",
          expiresAt: new Date(Date.now() - 5000),
        },
      ],
    });
    const res = await deleteExpired(new Request("http://localhost/api/v1/analytics/share"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deleted: number };
    expect(body.deleted).toBe(1);
    const remaining = await prisma.analyticsShareLink.findMany({});
    expect(remaining.map((r) => r.token).sort()).toEqual(["b".repeat(32), "c".repeat(32)]);
  });
});
