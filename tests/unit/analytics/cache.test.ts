import { memoizeCached } from "@/server/analytics/cache";
import { redis } from "@/server/redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

async function waitForRedis(timeoutMs = 3000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			await redis.ping();
			return;
		} catch {
			await new Promise((r) => setTimeout(r, 50));
		}
	}
}

async function flushAnalyticsKeys() {
	const keys: string[] = [];
	let cursor = "0";
	do {
		const [next, batch] = await redis.scan(cursor, "MATCH", "analytics:v1:*", "COUNT", 100);
		cursor = next;
		keys.push(...batch);
	} while (cursor !== "0");
	if (keys.length > 0) await redis.del(...keys);
}

describe("memoizeCached", () => {
	beforeAll(async () => {
		await waitForRedis();
	});

	beforeEach(async () => {
		await flushAnalyticsKeys();
	});

	afterAll(async () => {
		await flushAnalyticsKeys();
	});

	it("calls compute once when called twice with same params", async () => {
		let calls = 0;
		const compute = async () => {
			calls++;
			return { v: calls };
		};
		const a = await memoizeCached("testProc", { x: 1 }, compute);
		const b = await memoizeCached("testProc", { x: 1 }, compute);
		expect(calls).toBe(1);
		expect(a).toEqual(b);
	});

	it("calls compute twice when params differ", async () => {
		let calls = 0;
		const compute = async () => {
			calls++;
			return { v: calls };
		};
		await memoizeCached("testProc", { x: 1 }, compute);
		await memoizeCached("testProc", { x: 2 }, compute);
		expect(calls).toBe(2);
	});
});
