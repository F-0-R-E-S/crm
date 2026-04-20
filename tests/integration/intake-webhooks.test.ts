import { GET as getDeliveries } from "@/app/api/v1/affiliates/[id]/webhooks/deliveries/route";
import { GET, POST } from "@/app/api/v1/affiliates/[id]/webhooks/intake/route";
import { prisma } from "@/server/db";
import { buildIntakeEvent, dispatchIntakeEvent } from "@/server/webhooks/intake-outcome";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }) }));

describe("intake webhooks REST", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("POST создаёт webhook; GET возвращает список", async () => {
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const aff = await prisma.affiliate.create({ data: { name: "w" } });
    const r = await POST(
      new Request(`http://localhost:3000/api/v1/affiliates/${aff.id}/webhooks/intake`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/hook",
          secret: "s".repeat(32),
          events: ["intake.accepted"],
        }),
      }),
      { params: Promise.resolve({ id: aff.id }) },
    );
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.id).toBeTruthy();

    const g = await GET(
      new Request(`http://localhost:3000/api/v1/affiliates/${aff.id}/webhooks/intake`),
      { params: Promise.resolve({ id: aff.id }) },
    );
    const gb = await g.json();
    expect(gb.webhooks).toHaveLength(1);
  });

  it("dispatchIntakeEvent создаёт WebhookDelivery row", async () => {
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const aff = await prisma.affiliate.create({ data: { name: "d" } });
    await prisma.affiliateIntakeWebhook.create({
      data: {
        affiliateId: aff.id,
        url: "https://example.com/x",
        secret: "s".repeat(32),
        events: ["intake.accepted"],
      },
    });
    const n = await dispatchIntakeEvent(
      aff.id,
      buildIntakeEvent("intake.accepted", {
        leadId: "L",
        affiliateId: aff.id,
        traceId: "T",
      }),
    );
    expect(n).toBe(1);
    const deliveries = await prisma.webhookDelivery.findMany();
    expect(deliveries).toHaveLength(1);

    const r = await getDeliveries(
      new Request(`http://localhost:3000/api/v1/affiliates/${aff.id}/webhooks/deliveries`),
      { params: Promise.resolve({ id: aff.id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.deliveries).toHaveLength(1);
    expect(b.deliveries[0].signature).toMatch(/^sha256=/);
  });
});
