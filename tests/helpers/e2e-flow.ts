import { createHash } from "node:crypto";
import { POST as INTAKE } from "@/app/api/v1/leads/route";
import { POST as POSTBACK } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { handleNotifyAffiliate } from "@/server/jobs/notify-affiliate";
import { handlePushLead } from "@/server/jobs/push-lead";
import { signHmac } from "@/server/postback/hmac";
import { type MockBroker, startMockBroker } from "./mock-broker";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export type E2EFlowResult = {
  leadId: string;
  brokerId: string;
  affiliateId: string;
  apiKey: string;
  mockBroker: MockBroker;
};

/**
 * Runs a v1.0 happy path end-to-end:
 * signup (org + admin) → affiliate + API key → broker + flow → intake →
 * push → inbound postback (FTD) → affiliate outbound postback.
 *
 * Returns ids + the mock broker handle. Caller is responsible for `.stop()`
 * on the mock broker once assertions are complete.
 *
 * NOTE: `resetDb()` is intentionally not called inside — the caller decides
 * when to reset so that multiple helpers can compose in a single test.
 */
export async function runE2EFlow(): Promise<E2EFlowResult> {
  const mockBroker = await startMockBroker();
  mockBroker.respondWith(200, { id: "e2e-v1-ext-1", status: "accepted" });

  const slug = `e2e-org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const org = await prisma.org.create({ data: { name: "e2e-org", slug } });
  // User is needed for auth-derived flows (metrics, alerts). Optional for this path but cheap.
  await prisma.user.create({
    data: {
      email: `e2e-${Date.now()}@example.com`,
      passwordHash: "bcrypt$stub",
      role: "ADMIN",
      orgId: org.id,
    },
  });

  const affiliate = await prisma.affiliate.create({
    data: {
      name: "e2e-v1-aff",
      totalDailyCap: 1000,
      isActive: true,
    },
  });
  const rawKey = `ak_e2e_${"v1test".padEnd(40, "x")}`;
  await prisma.apiKey.create({
    data: {
      affiliateId: affiliate.id,
      keyHash: sha(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      label: "e2e-v1",
    },
  });

  const brokerSecret = "e2e-v1-broker-secret";
  const broker = await prisma.broker.create({
    data: {
      name: "e2e-v1-broker",
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
    },
  });
  await prisma.rotationRule.create({ data: { geo: "UA", brokerId: broker.id, priority: 1 } });

  const intakeRes = await INTAKE(
    new Request("http://x/api/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        external_lead_id: "e2e-v1-1",
        first_name: "E2E",
        last_name: "Flow",
        email: `e2e-${Date.now()}@example.com`,
        phone: "+380671234567",
        geo: "UA",
        ip: "1.2.3.4",
        sub_id: "sub-e2e-v1",
        event_ts: new Date().toISOString(),
      }),
    }),
  );
  const body = (await intakeRes.json()) as { lead_id: string; trace_id?: string };
  if (!body.lead_id) {
    throw new Error(
      `e2e intake failed: status=${intakeRes.status} body=${JSON.stringify(body)}`,
    );
  }

  // 2. push-lead
  await handlePushLead({ leadId: body.lead_id, traceId: body.trace_id ?? "e2e-v1" });

  // 3. outbound postback (lead_pushed) — best-effort, no-op if no affiliate postback URL.
  await handleNotifyAffiliate({ leadId: body.lead_id, event: "lead_pushed" });

  // 4. inbound FTD postback
  const pbBody = { lead_id: "e2e-v1-ext-1", status: "ftd" };
  const pbSig = signHmac(brokerSecret, JSON.stringify(pbBody));
  await POSTBACK(
    new Request(`http://x/api/v1/postbacks/${broker.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": pbSig },
      body: JSON.stringify(pbBody),
    }),
    { params: Promise.resolve({ brokerId: broker.id }) },
  );

  return {
    leadId: body.lead_id,
    brokerId: broker.id,
    affiliateId: affiliate.id,
    apiKey: rawKey,
    mockBroker,
  };
}
