import { prisma } from "@/server/db";
import {
	conversionBreakdown,
	rejectBreakdown,
	revenueBreakdown,
} from "@/server/analytics/service";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../helpers/db";

async function seedBroker() {
	return prisma.broker.create({
		data: {
			name: "b",
			endpointUrl: "https://example.test/mock",
			fieldMapping: {},
			postbackSecret: "s",
			postbackLeadIdPath: "id",
			postbackStatusPath: "status",
			isActive: true,
		},
	});
}

async function seedAff() {
	return prisma.affiliate.create({ data: { name: "t", contactEmail: "t@t.io" } });
}

function d(iso: string) {
	return new Date(iso);
}

describe("analytics breakdowns", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("conversionBreakdown returns stage funnel with rates", async () => {
		const aff = await seedAff();
		const bk = await seedBroker();
		await prisma.leadDailyRoll.create({
			data: {
				date: d("2026-06-01T00:00:00Z"),
				affiliateId: aff.id,
				brokerId: bk.id,
				geo: "US",
				totalReceived: 100,
				totalValidated: 80,
				totalRejected: 20,
				totalPushed: 70,
				totalAccepted: 40,
				totalDeclined: 10,
				totalFtd: 15,
			},
		});
		const res = await conversionBreakdown({
			from: d("2026-06-01T00:00:00Z"),
			to: d("2026-06-02T00:00:00Z"),
			groupBy: "day",
			filters: { affiliateIds: [], brokerIds: [], geos: [] },
			compareTo: null,
			metric: "leads",
		});
		expect(res.stages.received).toBe(100);
		expect(res.stages.validated).toBe(80);
		expect(res.stages.pushed).toBe(70);
		expect(res.stages.accepted).toBe(40);
		expect(res.stages.ftd).toBe(15);
		expect(Math.abs(res.rates.validationRate - 0.8)).toBeLessThan(0.001);
		expect(Math.abs(res.rates.acceptanceRate - 40 / 70)).toBeLessThan(0.001);
		expect(Math.abs(res.rates.ftdRate - 15 / 40)).toBeLessThan(0.001);
	});

	it("rejectBreakdown groups leads by rejectReason", async () => {
		const aff = await seedAff();
		const baseAt = d("2026-06-01T10:00:00Z");
		for (const [i, reason] of ["blacklist_email", "blacklist_email", "cap_blocked"].entries()) {
			await prisma.lead.create({
				data: {
					affiliateId: aff.id,
					geo: "US",
					ip: "1.1.1.1",
					eventTs: baseAt,
					state: "REJECTED",
					rejectReason: reason,
					receivedAt: baseAt,
					traceId: `rej-${i}`,
				},
			});
		}
		const res = await rejectBreakdown({
			from: d("2026-06-01T00:00:00Z"),
			to: d("2026-06-02T00:00:00Z"),
			groupBy: "day",
			filters: { affiliateIds: [], brokerIds: [], geos: [] },
			compareTo: null,
			metric: "leads",
		});
		expect(res.total).toBe(3);
		const mp = Object.fromEntries(res.byReason.map((r) => [r.reason, r.count]));
		expect(mp.blacklist_email).toBe(2);
		expect(mp.cap_blocked).toBe(1);
	});

	it("revenueBreakdown returns rows with bucket/revenue/ftds", async () => {
		const aff = await seedAff();
		const bk = await seedBroker();
		await prisma.leadDailyRoll.create({
			data: {
				date: d("2026-06-01T00:00:00Z"),
				affiliateId: aff.id,
				brokerId: bk.id,
				geo: "US",
				totalReceived: 100,
				totalPushed: 70,
				totalFtd: 15,
			},
		});
		const res = await revenueBreakdown({
			from: d("2026-06-01T00:00:00Z"),
			to: d("2026-06-02T00:00:00Z"),
			groupBy: "broker",
			filters: { affiliateIds: [], brokerIds: [], geos: [] },
			compareTo: null,
			metric: "revenue",
		});
		expect(res.rows.length).toBeGreaterThanOrEqual(1);
		for (const r of res.rows) {
			expect(r).toHaveProperty("bucket");
			expect(r).toHaveProperty("revenue");
			expect(r).toHaveProperty("ftds");
			expect(r).toHaveProperty("pushed");
		}
	});
});
