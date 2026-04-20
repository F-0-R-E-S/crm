import { evaluateAlerts } from "@/server/alerts/evaluator";
import { rules as allRules } from "@/server/alerts/rules";
import { prisma } from "@/server/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function makeAff(name: string) {
  return prisma.affiliate.create({ data: { name } });
}

async function makeLead(affId: string, state: string, overrides: Record<string, unknown> = {}) {
  return prisma.lead.create({
    data: {
      affiliateId: affId,
      geo: "UA",
      ip: "1.2.3.4",
      eventTs: new Date(),
      traceId: `t-${Math.random()}`,
      subId: `s-${Math.random()}`,
      state: state as never,
      ...overrides,
    },
  });
}

describe("alerts engine", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(async () => {
    await prisma.alertLog.deleteMany();
  });

  it("does not trigger when DB is quiet", async () => {
    const summary = await evaluateAlerts();
    expect(summary.triggered).toEqual([]);
    const rows = await prisma.alertLog.findMany();
    expect(rows).toHaveLength(0);
  });

  it("intake_failure_rate triggers + dedupes + auto-resolves", async () => {
    const aff = await makeAff("alerts-aff");
    // 195 pushed + 5 rejected = 2.5%  — exceeds 1%
    for (let i = 0; i < 195; i++) await makeLead(aff.id, "PUSHED");
    for (let i = 0; i < 5; i++) await makeLead(aff.id, "REJECTED");

    const r1 = await evaluateAlerts();
    expect(r1.triggered).toContain("intake_failure_rate");
    let rows = await prisma.alertLog.findMany({ where: { ruleKey: "intake_failure_rate" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBe("critical");

    // dedupe: second run within window does not insert a new row
    await evaluateAlerts();
    rows = await prisma.alertLog.findMany({ where: { ruleKey: "intake_failure_rate" } });
    expect(rows).toHaveLength(1);

    // auto-resolve: once the cause is removed, the row is closed
    await prisma.lead.updateMany({ where: { state: "REJECTED" }, data: { state: "PUSHED" } });
    const r3 = await evaluateAlerts();
    expect(r3.resolved).toContain("intake_failure_rate");
    rows = await prisma.alertLog.findMany({ where: { ruleKey: "intake_failure_rate" } });
    expect(rows[0].resolvedAt).not.toBeNull();
  });

  it("routing_p95 triggers when LeadEvent(ROUTING_DECIDED) p95 > 1000ms", async () => {
    const aff = await makeAff("p95-aff");
    const lead = await makeLead(aff.id, "NEW");
    const values = [200, 300, 400, 500, 700, 800, 900, 1200, 1400, 1600];
    for (const v of values) {
      await prisma.leadEvent.create({
        data: { leadId: lead.id, kind: "ROUTING_DECIDED", meta: { decidedInMs: v } },
      });
    }
    const summary = await evaluateAlerts();
    expect(summary.triggered).toContain("routing_p95");
  });

  it("autologin_sla_breach triggers on failed+slow attempts", async () => {
    const aff = await makeAff("sla-aff");
    const lead = await makeLead(aff.id, "NEW");
    const broker = await prisma.broker.create({
      data: {
        name: "sla-broker",
        endpointUrl: "http://nowhere",
        fieldMapping: {},
        postbackSecret: "s",
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
      },
    });
    for (let i = 0; i < 2; i++) {
      await prisma.autologinAttempt.create({
        data: {
          leadId: lead.id,
          brokerId: broker.id,
          status: "FAILED",
          durationMs: 12_000,
          stage: "AUTHENTICATING",
        },
      });
    }
    const summary = await evaluateAlerts();
    expect(summary.triggered).toContain("autologin_sla_breach");
  });

  it("broker_down_prolonged triggers when a broker has been DOWN > 10min", async () => {
    await prisma.broker.create({
      data: {
        name: "down-broker",
        endpointUrl: "http://nowhere",
        fieldMapping: {},
        postbackSecret: "s",
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        lastHealthStatus: "DOWN",
        lastHealthCheckAt: new Date(Date.now() - 11 * 60 * 1000),
      },
    });
    const summary = await evaluateAlerts();
    expect(summary.triggered).toContain("broker_down_prolonged");
  });

  it("exposes all 6 rules", () => {
    const keys = allRules.map((r) => r.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "intake_failure_rate",
        "routing_p95",
        "autologin_sla_breach",
        "manual_queue_depth",
        "broker_down_prolonged",
        "ftd_dropoff",
      ]),
    );
  });
});
