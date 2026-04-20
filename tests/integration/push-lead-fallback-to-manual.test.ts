import * as brokerPush from "@/server/broker-adapter/push";
import { prisma } from "@/server/db";
import { handlePushLead } from "@/server/jobs/push-lead";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

describe("push-lead fallback to manual queue", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("hits primary, then fallback broker, then manual queue when both fail", async () => {
		const aff = await prisma.affiliate.create({
			data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
		});
		const primary = await prisma.broker.create({
			data: {
				name: "primary",
				endpointUrl: "https://p.example",
				fieldMapping: {},
				postbackSecret: "s",
				postbackLeadIdPath: "$.id",
				postbackStatusPath: "$.status",
			},
		});
		const fallback = await prisma.broker.create({
			data: {
				name: "fallback",
				endpointUrl: "https://f.example",
				fieldMapping: {},
				postbackSecret: "s",
				postbackLeadIdPath: "$.id",
				postbackStatusPath: "$.status",
			},
		});
		await prisma.rotationRule.create({
			data: { geo: "US", brokerId: primary.id, priority: 1 },
		});
		await prisma.rotationRule.create({
			data: { geo: "US", brokerId: fallback.id, priority: 2 },
		});
		const lead = await prisma.lead.create({
			data: {
				affiliateId: aff.id,
				geo: "US",
				ip: "203.0.113.5",
				eventTs: new Date(),
				traceId: "trace-fb-1",
			},
		});

		vi.spyOn(brokerPush, "pushToBroker").mockResolvedValue({
			success: false,
			httpStatus: 500,
			durationMs: 10,
			attemptN: 1,
			error: "upstream 500",
		});

		// attemptN=5 forces exhaustion past the retry schedule and lets the manual queue fire.
		await handlePushLead({ leadId: lead.id, traceId: lead.traceId, attemptN: 5 });

		const row = await prisma.manualReviewQueue.findUnique({
			where: { leadId: lead.id },
		});
		expect(row).toBeTruthy();
		expect(row?.reason).toBe("BROKER_FAILED");
		expect(row?.lastBrokerId).toBe(fallback.id);

		const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
		expect(updated?.state).toBe("FAILED");

		vi.restoreAllMocks();
	});

	// Full Flow fallback plan walker is deferred to S4: selectBrokerPool currently
	// returns only RotationRule-derived brokers and does not expose a flowId. The
	// broker-level priority cascade (tested above) covers the primary→fallback
	// broker scenario for UAD S3 goals; multi-flow fallback hops land with the
	// selectBrokerPoolForFlow refactor in S4.
	it.todo("walks Flow fallback plan and enqueues manual review only after all flows exhausted");
});
