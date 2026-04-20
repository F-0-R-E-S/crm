import { computeSla } from "@/server/autologin/sla";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function seedAffBrokerLead() {
  const aff = await prisma.affiliate.create({ data: { name: "sla-aff" } });
  const broker = await prisma.broker.create({
    data: {
      name: "sla-broker",
      endpointUrl: "https://example.com/push",
      fieldMapping: {} as object,
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.id",
      postbackStatusPath: "$.s",
    },
  });
  const lead = await prisma.lead.create({
    data: {
      affiliateId: aff.id,
      brokerId: broker.id,
      geo: "US",
      ip: "1.2.3.4",
      eventTs: new Date(),
      traceId: `sla-${Math.random()}`,
    },
  });
  return { leadId: lead.id, brokerId: broker.id };
}

describe("computeSla", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns zeros + null percentiles on empty window", async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86_400_000);
    const res = await computeSla({ from, to });
    expect(res.total).toBe(0);
    expect(res.successful).toBe(0);
    expect(res.failed).toBe(0);
    expect(res.uptime_pct).toBe(0);
    expect(res.p50_duration_ms).toBeNull();
    expect(res.p95_duration_ms).toBeNull();
    expect(res.by_stage_failed).toEqual({
      INITIATING: 0,
      CAPTCHA: 0,
      AUTHENTICATING: 0,
      SESSION_READY: 0,
    });
    expect(res.window.from).toBe(from.toISOString());
    expect(res.window.to).toBe(to.toISOString());
  });

  it("aggregates populated window — 4 succeeded + 2 failed", async () => {
    const { leadId, brokerId } = await seedAffBrokerLead();
    const now = new Date();
    // 4 successes with varied durationMs
    for (const d of [100, 200, 300, 400]) {
      await prisma.autologinAttempt.create({
        data: {
          leadId,
          brokerId,
          status: "SUCCEEDED",
          stage: "SESSION_READY",
          durationMs: d,
          completedAt: now,
        },
      });
    }
    // 2 failed — one at CAPTCHA, one at AUTHENTICATING
    await prisma.autologinAttempt.create({
      data: {
        leadId,
        brokerId,
        status: "FAILED",
        stage: "CAPTCHA",
        errorStage: "CAPTCHA",
        durationMs: 50,
        completedAt: now,
      },
    });
    await prisma.autologinAttempt.create({
      data: {
        leadId,
        brokerId,
        status: "FAILED",
        stage: "AUTHENTICATING",
        errorStage: "AUTHENTICATING",
        durationMs: 500,
        completedAt: now,
      },
    });

    const to = new Date(now.getTime() + 60_000);
    const from = new Date(now.getTime() - 7 * 86_400_000);
    const res = await computeSla({ from, to });
    expect(res.total).toBe(6);
    expect(res.successful).toBe(4);
    expect(res.failed).toBe(2);
    // uptime ~66.66%
    expect(res.uptime_pct).toBeGreaterThan(66);
    expect(res.uptime_pct).toBeLessThan(67);
    expect(res.by_stage_failed.CAPTCHA).toBe(1);
    expect(res.by_stage_failed.AUTHENTICATING).toBe(1);
    expect(res.by_stage_failed.INITIATING).toBe(0);
    expect(res.p50_duration_ms).not.toBeNull();
    expect(res.p95_duration_ms).not.toBeNull();
  });
});
