import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { resetDb } from "../helpers/db";
import { startMockTracker, type MockTracker } from "../helpers/mock-affiliate-tracker";
import { handleNotifyAffiliate } from "@/server/jobs/notify-affiliate";

describe("handleNotifyAffiliate", () => {
  let tr: MockTracker;
  let leadId = "";

  beforeEach(async () => {
    await resetDb();
    tr = await startMockTracker();
    const aff = await prisma.affiliate.create({
      data: {
        name: "op-aff",
        postbackUrl: `http://127.0.0.1:${tr.port}/?click={sub_id}&s={status}`,
        postbackEvents: ["lead_pushed", "ftd"],
      },
    });
    const lead = await prisma.lead.create({
      data: { affiliateId: aff.id, geo: "UA", ip: "1.1.1.1", eventTs: new Date(), traceId: "op-t", subId: "click-1", state: "PUSHED" },
    });
    leadId = lead.id;
  });
  afterEach(() => tr.stop());

  it("sends on subscribed event", async () => {
    await handleNotifyAffiliate({ leadId, event: "lead_pushed" });
    expect(tr.hits).toHaveLength(1);
    expect(tr.hits[0].url).toContain("click=click-1");
    const rows = await prisma.outboundPostback.findMany({ where: { leadId } });
    expect(rows[0].deliveredAt).not.toBeNull();
  });

  it("no-op for unsubscribed event", async () => {
    await handleNotifyAffiliate({ leadId, event: "declined" });
    expect(tr.hits).toHaveLength(0);
    expect(await prisma.outboundPostback.count({ where: { leadId } })).toBe(0);
  });

  it("records failure after 3 retries on 500", async () => {
    tr.respondWith(500);
    await handleNotifyAffiliate({ leadId, event: "ftd" });
    const row = await prisma.outboundPostback.findFirst({ where: { leadId, event: "ftd" } });
    expect(row?.deliveredAt).toBeNull();
    expect(row?.attemptN).toBe(3);
  }, 20_000);

  it("stops on 4xx — no retry", async () => {
    tr.respondWith(404);
    await handleNotifyAffiliate({ leadId, event: "ftd" });
    expect(tr.hits).toHaveLength(1);
  });
});
