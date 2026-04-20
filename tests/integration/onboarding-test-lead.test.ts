import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Wizard Step 4 contract: a sandbox-flagged API key short-circuits intake
 * to the deterministic mock-outcome pipeline (no outbound broker HTTP, no
 * FAILED lead). Documents the intake dependency.
 */
describe("onboarding test lead — sandbox short-circuit", () => {
  const plaintext = "ak_test_deadbeefdeadbeefdeadbeef";
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({
      data: { name: "wizard-aff", contactEmail: "aff@w.io" },
    });
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(plaintext),
        keyPrefix: plaintext.slice(0, 12),
        label: "onboarding-wizard",
        isSandbox: true,
      },
    });
  });

  it("accepts a sandbox test lead without failing (no outbound broker push)", async () => {
    const r = await POST(
      new Request("http://localhost:3000/api/v1/leads?mode=sandbox", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${plaintext}`,
          "x-api-version": "2026-01",
        },
        body: JSON.stringify({
          external_lead_id: "ACCEPT-wizard-001",
          first_name: "Wizard",
          last_name: "Tester",
          email: "wiz@t.io",
          phone: "+14155551212",
          geo: "US",
          ip: "8.8.8.8",
          event_ts: new Date().toISOString(),
        }),
      }),
    );

    expect([200, 201, 202]).toContain(r.status);
    const body = await r.json();
    expect(body.trace_id).toBeTruthy();
    expect(body.sandbox).toBe(true);

    // If a Lead row was written, it must not be FAILED; if not written,
    // the sandbox path short-circuited as documented.
    const lead = await prisma.lead.findUnique({ where: { traceId: body.trace_id } });
    if (lead) {
      expect(lead.state).not.toBe("FAILED");
    }
  });
});
