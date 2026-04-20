import { prisma } from "@/server/db";
import type { Affiliate, Broker, Lead, Prisma, UserRole } from "@prisma/client";

let counter = 0;
const nextId = () => `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 8)}`;

export async function seedAffiliate(
  overrides: Partial<Prisma.AffiliateUncheckedCreateInput> = {},
): Promise<Affiliate> {
  return prisma.affiliate.create({
    data: {
      name: `aff-${nextId()}`,
      contactEmail: `aff-${nextId()}@t.io`,
      isActive: true,
      ...overrides,
    },
  });
}

export async function seedBroker(
  overrides: Partial<Prisma.BrokerUncheckedCreateInput> = {},
): Promise<Broker> {
  const id = nextId();
  return prisma.broker.create({
    data: {
      name: `broker-${id}`,
      endpointUrl: "http://broker.example.test/api",
      fieldMapping: {},
      postbackSecret: "test-secret",
      postbackLeadIdPath: "broker_lead_id",
      postbackStatusPath: "status",
      statusMapping: {},
      ...overrides,
    },
  });
}

export type SeedLeadOverrides = Partial<Prisma.LeadUncheckedCreateInput>;

export async function seedLead(overrides: SeedLeadOverrides = {}): Promise<Lead> {
  let affiliateId = overrides.affiliateId;
  if (!affiliateId) {
    const aff = await seedAffiliate();
    affiliateId = aff.id;
  }
  const id = nextId();
  const data: Prisma.LeadUncheckedCreateInput = {
    affiliateId,
    geo: "US",
    ip: "1.1.1.1",
    eventTs: new Date(),
    traceId: `trace-${id}`,
    state: overrides.brokerId ? "PUSHED" : "NEW",
    ...overrides,
  };
  return prisma.lead.create({ data });
}

// biome-ignore lint/suspicious/noExplicitAny: ctx shape matches protectedProcedure's expectation at runtime but NextAuth's Session type is stricter
export async function seedAdminSession(role: UserRole = "ADMIN"): Promise<any> {
  const user = await prisma.user.create({
    data: { email: `u-${nextId()}@t.io`, passwordHash: "x", role },
  });
  return {
    session: { user: { id: user.id, role } },
    prisma,
    userId: user.id,
    role,
  };
}
