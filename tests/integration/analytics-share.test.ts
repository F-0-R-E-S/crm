import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
	auth: vi.fn(async () => ({ user: { id: "u1", email: "u@t.io", role: "ADMIN" } })),
	handlers: {},
	signIn: vi.fn(),
	signOut: vi.fn(),
}));

const { POST: createShare } = await import("@/app/api/v1/analytics/share/route");
const { GET: getShare } = await import("@/app/api/v1/analytics/share/[token]/route");

describe("POST /api/v1/analytics/share + GET /:token", () => {
	beforeEach(async () => {
		await resetDb();
		await prisma.user.create({
			data: { id: "u1", email: "u@t.io", passwordHash: "x", role: "ADMIN" },
		});
	});

	it("creates a token and round-trips the query on GET", async () => {
		const body = {
			query: {
				proc: "metricSeries",
				from: "2026-06-01T00:00:00.000Z",
				to: "2026-06-07T00:00:00.000Z",
				metric: "leads",
				groupBy: "day",
				compareTo: null,
				filters: { affiliateIds: [], brokerIds: [], geos: [] },
			},
		};
		const res = await createShare(
			new Request("http://localhost/api/v1/analytics/share", {
				method: "POST",
				body: JSON.stringify(body),
				headers: { "content-type": "application/json" },
			}),
		);
		expect(res.status).toBe(200);
		const json = (await res.json()) as { token: string };
		expect(json.token).toMatch(/^[a-f0-9]{32}$/);

		const getRes = await getShare(new Request("http://localhost"), {
			params: Promise.resolve({ token: json.token }),
		});
		expect(getRes.status).toBe(200);
		const getJson = (await getRes.json()) as { query: { proc: string } };
		expect(getJson.query.proc).toBe("metricSeries");
	});

	it("returns 410 for expired tokens", async () => {
		const row = await prisma.analyticsShareLink.create({
			data: {
				token: "a".repeat(32),
				query: { proc: "metricSeries" },
				createdBy: "u1",
				expiresAt: new Date(Date.now() - 1000),
			},
		});
		const getRes = await getShare(new Request("http://localhost"), {
			params: Promise.resolve({ token: row.token }),
		});
		expect(getRes.status).toBe(410);
	});

	it("returns 404 for unknown tokens", async () => {
		const getRes = await getShare(new Request("http://localhost"), {
			params: Promise.resolve({ token: "nope" }),
		});
		expect(getRes.status).toBe(404);
	});
});
