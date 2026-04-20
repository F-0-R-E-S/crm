import { GET } from "@/app/api/v1/affiliates/[id]/leads/[leadId]/events/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "admin-1", role: "ADMIN" } }),
}));

describe("GET /api/v1/affiliates/[id]/leads/[leadId]/events", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("возвращает события с маскированным PII", async () => {
    await prisma.user.create({
      data: { id: "admin-1", email: "a@b.com", passwordHash: "x", role: "ADMIN" },
    });
    const aff = await prisma.affiliate.create({ data: { name: "a" } });
    const lead = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "UA",
        ip: "1.2.3.4",
        email: "secret@x.com",
        eventTs: new Date(),
        traceId: "aq1",
        events: {
          create: [{ kind: "RECEIVED", meta: { ip: "1.2.3.4", email: "secret@x.com" } }],
        },
      },
    });
    const r = await GET(
      new Request(
        `http://localhost:3000/api/v1/affiliates/${aff.id}/leads/${lead.id}/events`,
      ),
      { params: Promise.resolve({ id: aff.id, leadId: lead.id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.events).toHaveLength(1);
    const meta = b.events[0].meta;
    expect(meta.ip).toBe("1.2.3.0/24");
    expect(meta.email).not.toBe("secret@x.com");
  });
});
