import { __getAlertCalls, __resetAlertCalls } from "@/server/alerts/emitter";
import { prisma } from "@/server/db";
import { checkManualQueueDepth } from "@/server/jobs/manual-queue-depth-check";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("checkManualQueueDepth", () => {
	beforeEach(async () => {
		await resetDb();
		__resetAlertCalls();
	});

	it("does not emit when depth is below threshold", async () => {
		await checkManualQueueDepth(100);
		expect(
			__getAlertCalls().filter((c) => c.event === "manual_queue_depth_exceeded"),
		).toHaveLength(0);
	});

	it("emits manual_queue_depth_exceeded when depth >= threshold", async () => {
		const aff = await prisma.affiliate.create({
			data: { name: "t", contactEmail: "t@t.io" },
		});
		for (let i = 0; i < 3; i++) {
			const l = await prisma.lead.create({
				data: {
					affiliateId: aff.id,
					geo: "US",
					ip: "1.1.1.1",
					eventTs: new Date(),
					traceId: `depth-${i}`,
				},
			});
			await prisma.manualReviewQueue.create({
				data: { leadId: l.id, reason: "BROKER_FAILED" },
			});
		}
		await checkManualQueueDepth(3);
		const calls = __getAlertCalls().filter((c) => c.event === "manual_queue_depth_exceeded");
		expect(calls).toHaveLength(1);
		expect(calls[0].payload.depth).toBe(3);
		expect(calls[0].payload.threshold).toBe(3);
	});
});
