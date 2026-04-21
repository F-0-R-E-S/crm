import { prisma } from "@/server/db";
import type { Affiliate, Broker, Lead, Prisma, UserRole } from "@prisma/client";

let counter = 0;
const nextId = () => `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_TENANT = "tenant_default";

async function ensureDefaultTenant() {
  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT },
    update: {},
    create: {
      id: DEFAULT_TENANT,
      slug: "default",
      name: "Default Tenant",
      displayName: "GambChamp Default",
    },
  });
}

export async function seedAffiliate(
  overrides: Partial<Prisma.AffiliateUncheckedCreateInput> = {},
): Promise<Affiliate> {
  await ensureDefaultTenant();
  return prisma.affiliate.create({
    data: {
      tenantId: DEFAULT_TENANT,
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
  await ensureDefaultTenant();
  const id = nextId();
  return prisma.broker.create({
    data: {
      tenantId: DEFAULT_TENANT,
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
    tenantId: DEFAULT_TENANT,
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
  await ensureDefaultTenant();
  const user = await prisma.user.create({
    data: {
      email: `u-${nextId()}@t.io`,
      passwordHash: "x",
      role,
      tenantId: DEFAULT_TENANT,
    },
  });
  return {
    session: { user: { id: user.id, role, tenantId: DEFAULT_TENANT } },
    prisma,
    userId: user.id,
    role,
    tenantId: DEFAULT_TENANT,
  };
}
