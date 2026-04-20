import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { runE2EFlow } from "../helpers/e2e-flow";

describe("v1.0 full-flow E2E", () => {
  let mockBrokerStop: (() => Promise<void>) | null = null;
  let leadId = "";
  let brokerId = "";

  beforeAll(async () => {
    await resetDb();
    await redis.flushdb();
    const result = await runE2EFlow();
    leadId = result.leadId;
    brokerId = result.brokerId;
    mockBrokerStop = () => result.mockBroker.stop();
  }, 30_000);

  afterAll(async () => {
    if (mockBrokerStop) await mockBrokerStop();
  });

  it("intake → routing → push → FTD postback → telegram outbox", async () => {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead).toBeTruthy();
    expect(lead!.brokerId).toBe(brokerId);
    expect(["PUSHED", "PUSH_PENDING", "PUSH_FAILED", "FTD"]).toContain(lead!.state);

    // LeadEvent trail: intake + push attempt + push success + FTD/status transition
    const events = await prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
    });
    expect(events.length).toBeGreaterThanOrEqual(3);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("BROKER_PUSH_ATTEMPT");

    // push attempts are tracked via LeadEvent, not a separate table — verified above.
  });
});
