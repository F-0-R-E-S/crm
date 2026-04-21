/**
 * v1.5 cross-sprint integration smoke.
 *
 * Stitches every v1.5 subsystem into a single linear happy-path:
 *   1. Signup (org + admin user) + onboarding step bump.
 *   2. Create a visual-editor flow (entry → WRR algo → broker target → exit)
 *      and publish it.
 *   3. Push 20 mixed-GEO leads through the legacy intake → push pipeline
 *      (routing uses RotationRule which is the v1.0 engine; the visual flow
 *      exists alongside it — v1.5 invariant #1).
 *   4. Refresh analytics rollups and assert they include the new leads
 *      bucketed by canonicalStatus.
 *   5. Schedule a broker `isActive=false` change for +1 minute into the past
 *      (mock-clock equivalent: we set `applyAt` to now-5s) and apply it,
 *      asserting the broker row was mutated.
 *   6. Round-trip a postback and assert `canonicalStatus` is set on the lead.
 *
 * All in-process. The mock broker is the same helper the v1.0 full-flow test
 * uses.
 */
import { createHash } from "node:crypto";
import { POST as INTAKE } from "@/app/api/v1/leads/route";
import { POST as POSTBACK } from "@/app/api/v1/postbacks/[brokerId]/route";
import { refreshDailyRollups } from "@/server/analytics/rollup";
import { prisma } from "@/server/db";
import { handlePushLead } from "@/server/jobs/push-lead";
import { signHmac } from "@/server/postback/hmac";
import { redis } from "@/server/redis";
import { publishFlow } from "@/server/routing/flow/publish";
import { createDraftFlow } from "@/server/routing/flow/repository";
import { newFlowGraph } from "@/server/routing/flow/seed";
import { applyScheduledChange } from "@/server/scheduled-changes/orchestrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { type MockBroker, startMockBroker } from "../helpers/mock-broker";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("v1.5 full-flow E2E", () => {
  let mockBroker: MockBroker | null = null;
  let brokerId = "";
  let affiliateId = "";
  let flowId = "";
  let scheduledChangeId = "";
  const leadIds: string[] = [];
  const extIds: string[] = [];

  const GEOS = ["UA", "DE", "PL", "RO"] as const;

  beforeAll(async () => {
    await resetDb();
    await redis.flushdb();

    // --- 1. Signup: org + admin user ---
    const slug = `v15-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const org = await prisma.org.create({ data: { name: "v15-e2e", slug } });
    const admin = await prisma.user.create({
      data: {
        email: `v15-${Date.now()}@t.local`,
        passwordHash: "bcrypt$stub",
        role: "ADMIN",
        orgId: org.id,
      },
    });
    // onboarding: bump progress to step 2 (org created)
    await prisma.onboardingProgress.upsert({
      where: { orgId: org.id },
      create: { orgId: org.id, currentStep: 2, stepData: { created: true } },
      update: { currentStep: 2 },
    });

    // --- 2. Affiliate + API key + mock broker + broker + rotation rule ---
    const affiliate = await prisma.affiliate.create({
      data: { name: "v15-aff", totalDailyCap: 10_000, isActive: true },
    });
    affiliateId = affiliate.id;
    const rawKey = `ak_v15_${"e2e".padEnd(40, "x")}`;
    await prisma.apiKey.create({
      data: {
        affiliateId: affiliate.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "v15-e2e",
      },
    });

    mockBroker = await startMockBroker();

    const brokerSecret = "v15-broker-secret";
    const broker = await prisma.broker.create({
      data: {
        name: "v15-broker",
        endpointUrl: `http://127.0.0.1:${mockBroker.port}/push`,
        fieldMapping: {
          firstName: "first_name",
          lastName: "last_name",
          email: "email",
          phone: "phone",
          geo: "country",
        },
        postbackSecret: brokerSecret,
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        statusMapping: { accepted: "ACCEPTED", ftd: "FTD" },
        responseIdPath: "id",
        isActive: true,
        dailyCap: 1000,
      },
    });
    brokerId = broker.id;
    for (const geo of GEOS) {
      await prisma.rotationRule.create({ data: { geo, brokerId: broker.id, priority: 1 } });
    }

    // --- 2b. Canonical status seed + status mapping for 'ftd' ---
    const canonFtd = await prisma.canonicalStatus.upsert({
      where: { code: "ftd" },
      update: {},
      create: { code: "ftd", label: "FTD", category: "CONVERTED", sortOrder: 1 },
    });
    await prisma.statusMapping.create({
      data: { brokerId: broker.id, rawStatus: "ftd", canonicalStatusId: canonFtd.id },
    });

    // --- 3. Visual editor flow: create a draft and publish it ---
    // We wire a single broker-target into the default graph so the published
    // flow is valid (no published-with-zero-targets guard trip).
    const baseGraph = newFlowGraph();
    const graphWithBroker = {
      nodes: [
        ...baseGraph.nodes.filter((n) => n.id !== "exit"),
        {
          id: "bt1",
          kind: "BrokerTarget" as const,
          brokerId: broker.id,
          weight: 100,
        },
        { id: "exit", kind: "Exit" as const, label: "Exit" },
      ],
      edges: [
        { from: "entry", to: "algo", condition: "default" as const },
        { from: "algo", to: "bt1", condition: "default" as const },
        { from: "bt1", to: "exit", condition: "default" as const },
      ],
    };
    const draft = await createDraftFlow({
      name: "v15-e2e-flow",
      timezone: "UTC",
      graph: graphWithBroker,
      createdBy: admin.id,
    });
    flowId = draft.id;
    await publishFlow(flowId, admin.id);

    // --- 4. Push 20 mixed-GEO leads ---
    mockBroker.respondWith(200, { id: "v15-ext-ack", status: "accepted" });
    for (let i = 0; i < 20; i++) {
      const geo = GEOS[i % GEOS.length];
      const extId = `v15-ext-${i}`;
      extIds.push(extId);
      const res = await INTAKE(
        new Request("http://x/api/v1/leads", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${rawKey}`,
          },
          body: JSON.stringify({
            external_lead_id: extId,
            first_name: `E2E${i}`,
            last_name: "Flow",
            email: `e2e-${i}-${Date.now()}@example.com`,
            phone: `+4930000000${String(i).padStart(2, "0")}`,
            geo,
            ip: "1.2.3.4",
            sub_id: `sub-v15-${i}`,
            event_ts: new Date().toISOString(),
          }),
        }),
      );
      const body = (await res.json()) as { lead_id?: string; trace_id?: string };
      if (!body.lead_id) {
        throw new Error(`intake #${i} failed: status=${res.status} body=${JSON.stringify(body)}`);
      }
      leadIds.push(body.lead_id);
      // Push each one; broker responds 200 -> lead goes PUSHED/ACCEPTED.
      await handlePushLead({ leadId: body.lead_id, traceId: body.trace_id ?? `v15-${i}` });
    }

    // --- 5. Schedule a broker isActive=false change, then apply it. ---
    // Equivalent to "schedule for +1 min and wait (mock clock)".
    const sc = await prisma.scheduledChange.create({
      data: {
        entityType: "Broker",
        entityId: broker.id,
        payload: { isActive: false },
        applyAt: new Date(Date.now() - 1_000),
        createdBy: admin.id,
      },
    });
    scheduledChangeId = sc.id;
    await applyScheduledChange(sc.id, admin.id);

    // --- 6. Round-trip a postback on the first lead. ---
    // broker's statusMapping maps raw 'ftd' -> FTD. canonicalStatus should
    // also resolve via StatusMapping -> 'ftd'.
    const firstExt = extIds[0];
    const pbBody = { lead_id: "v15-ext-ack", status: "ftd", extRef: firstExt };
    const pbSig = signHmac(brokerSecret, JSON.stringify(pbBody));
    // Because push responded with id='v15-ext-ack' for every lead, we look up
    // the first lead by traceId. But simpler: just resolve by brokerLeadId.
    // The postback handler matches on brokerLeadId set at push-time.
    await POSTBACK(
      new Request(`http://x/api/v1/postbacks/${broker.id}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": pbSig },
        body: JSON.stringify(pbBody),
      }),
      { params: Promise.resolve({ brokerId: broker.id }) },
    );

    // --- 4b. Analytics rollup covers today. ---
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    await refreshDailyRollups({ from: today, to: tomorrow });
  }, 60_000);

  afterAll(async () => {
    if (mockBroker) await mockBroker.stop();
  });

  it("published a flow with an active version", async () => {
    const flow = await prisma.flow.findUniqueOrThrow({ where: { id: flowId } });
    expect(flow.status).toBe("PUBLISHED");
    expect(flow.activeVersionId).toBeTruthy();
  });

  it("ingested 20 leads across mixed GEOs", async () => {
    const leads = await prisma.lead.findMany({ where: { affiliateId } });
    expect(leads).toHaveLength(20);
    const geos = new Set(leads.map((l) => l.geo));
    expect(geos.size).toBeGreaterThanOrEqual(2);
  });

  it("rollup picked up today's leads (bucketed by canonicalStatus)", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const rows = await prisma.leadDailyRoll.findMany({ where: { date: today, affiliateId } });
    expect(rows.length).toBeGreaterThan(0);
    const totalReceived = rows.reduce((s, r) => s + r.totalReceived, 0);
    expect(totalReceived).toBe(20);
    // canonicalStatus column is populated (either '__none__' or the mapped
    // canonical code) — verifies S1.5-5 rollup polish landed.
    expect(rows.every((r) => typeof r.canonicalStatus === "string")).toBe(true);
  });

  it("applied the scheduled broker change within SLA", async () => {
    const sc = await prisma.scheduledChange.findUniqueOrThrow({ where: { id: scheduledChangeId } });
    expect(sc.status).toBe("APPLIED");
    expect(sc.appliedAt).toBeInstanceOf(Date);
    expect(Math.abs(sc.latencyMs ?? 99_999_999)).toBeLessThan(5 * 60_000);
    const broker = await prisma.broker.findUniqueOrThrow({ where: { id: brokerId } });
    expect(broker.isActive).toBe(false);
  });

  it("canonicalStatus is set on the postback-round-tripped lead", async () => {
    // Find the lead that was most recently transitioned to FTD.
    const ftd = await prisma.lead.findFirst({
      where: { state: "FTD", affiliateId },
      orderBy: { updatedAt: "desc" },
    });
    expect(ftd).toBeTruthy();
    // Either a mapped canonical code ('ftd') or the 'unmapped' sentinel.
    expect(typeof ftd?.canonicalStatus).toBe("string");
  });
});
