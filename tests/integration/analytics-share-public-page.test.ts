import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: SharedAnalyticsPage } = await import("@/app/share/analytics/[token]/page");

describe("Public /share/analytics/:token page (SSR)", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.user.create({
      data: { id: "owner-x", email: "o@t.io", passwordHash: "x", role: "ADMIN" },
    });
  });

  it("404s on unknown token", async () => {
    await expect(
      SharedAnalyticsPage({ params: Promise.resolve({ token: "does-not-exist" }) }),
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  it("renders 'Link expired' banner for expired tokens (no 404)", async () => {
    await prisma.analyticsShareLink.create({
      data: {
        token: "e".repeat(32),
        query: { proc: "metricSeries", from: "2026-06-01", to: "2026-06-02" },
        createdBy: "owner-x",
        expiresAt: new Date(Date.now() - 5000),
      },
    });
    const node = await SharedAnalyticsPage({ params: Promise.resolve({ token: "e".repeat(32) }) });
    const serialized = JSON.stringify(node);
    expect(serialized).toContain("Link expired");
  });

  it("passes valid proc/data/expiresAt props to SharedAnalyticsView", async () => {
    await prisma.analyticsShareLink.create({
      data: {
        token: "v".repeat(32),
        query: {
          proc: "metricSeries",
          metric: "leads",
          from: new Date("2026-06-01T00:00:00Z"),
          to: new Date("2026-06-07T00:00:00Z"),
          groupBy: "day",
          compareTo: null,
          filters: { affiliateIds: [], brokerIds: [], geos: [] },
        },
        createdBy: "owner-x",
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const node = (await SharedAnalyticsPage({
      params: Promise.resolve({ token: "v".repeat(32) }),
    })) as { props: { proc: string; expiresAt: string; data: unknown } };
    expect(node).toBeTruthy();
    expect(node.props.proc).toBe("metricSeries");
    // data ran through executeProc → a MetricSeriesResult (series + total)
    const d = node.props.data as { total: number; series: unknown[] } | null;
    expect(d).not.toBeNull();
    expect(typeof d?.total).toBe("number");
    expect(new Date(node.props.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
