/**
 * Full-reset + battle-mode seed for the prod (or any) DB.
 *
 * Usage:
 *   CONFIRM_WIPE=yes pnpm tsx scripts/prod-demo/reset-and-seed.ts
 *
 * Phase 1 — TRUNCATE every business table with CASCADE, keeping schema.
 * Phase 2 — Seed a realistic, varied, production-shaped demo: 1 tenant,
 *           admin + super-admin, 5 affiliates with differing configs,
 *           6 brokers across GEO buckets, a published Flow with a rich
 *           Filter / Algorithm / BrokerTarget / Fallback graph, per-flow
 *           caps (global + per-broker + per-country), anti-fraud policy
 *           + aggressive blacklists, canonical-status mappings, payout
 *           rules, a Growth-plan trial subscription, and 2 proxy
 *           endpoints.
 *
 * Phase 3 is traffic push — see `traffic.ts` next to this file.
 *
 * All money fields are Prisma.Decimal. All tenantId fields set to
 * `tenant_default`. No randomness in IDs so re-runs are idempotent via
 * the upserts used.
 */

import { createHash, randomBytes } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function requireConfirm() {
  if (process.env.CONFIRM_WIPE !== "yes") {
    console.error("Refusing to run without CONFIRM_WIPE=yes. Aborting.");
    process.exit(2);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Phase 1 — TRUNCATE
// ─────────────────────────────────────────────────────────────────────
async function wipe() {
  // Keep Prisma migration history table; keep pg-boss schema; otherwise
  // reset everything. TRUNCATE ... CASCADE handles FK order.
  const tables = [
    // Analytics / finance / billing
    "AlertLog",
    "AnalyticsShareLink",
    "AnalyticsPreset",
    "LeadHourlyRoll",
    "LeadDailyRoll",
    "CRGCohort",
    "BrokerPayoutRule",
    "AffiliatePayoutRule",
    "BrokerInvoice",
    "AffiliateInvoice",
    "Conversion",
    "Invoice",
    "PaymentMethod",
    "Subscription",
    // Routing
    "CapCounter",
    "CapCountryLimit",
    "CapDefinition",
    "FallbackStep",
    "FlowAlgorithmConfig",
    "FlowBranch",
    "FlowVersion",
    "Flow",
    "RotationRule",
    "DailyCap",
    // Telegram
    "TelegramEventLog",
    "TelegramSubscription",
    // Ops
    "ScheduledChange",
    "ManualReviewQueue",
    "AutologinAttempt",
    "ProxyEndpoint",
    "StatusMapping",
    "CanonicalStatus",
    // Broker
    "BrokerHealthCheck",
    "BrokerErrorSample",
    "BrokerTemplate",
    "Broker",
    // Intake / webhooks
    "PostbackReceipt",
    "OutboundPostback",
    "LeadEvent",
    "Lead",
    "IdempotencyKey",
    "WebhookDelivery",
    "AffiliateIntakeWebhook",
    "IntakeSettings",
    "ApiKey",
    "Affiliate",
    // Anti-fraud / audit
    "Blacklist",
    "FraudPolicy",
    "AuditLog",
    // Onboarding
    "OnboardingProgress",
    "Org",
    // Auth
    "User",
    // Tenant last
    "Tenant",
  ];
  const joined = tables.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${joined} RESTART IDENTITY CASCADE;`);
  console.log(`wiped ${tables.length} tables`);
}

// ─────────────────────────────────────────────────────────────────────
// Phase 2 — Seed
// ─────────────────────────────────────────────────────────────────────
interface SeedResult {
  tenantId: string;
  adminApiKey: string;
  affiliateApiKeys: Array<{ label: string; affiliateId: string; apiKey: string }>;
  brokerIds: string[];
  flowId: string;
}

async function seed(): Promise<SeedResult> {
  // Tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: "tenant_default",
      slug: "default",
      name: "GambChamp Demo",
      displayName: "GambChamp (battle-mode demo)",
      domains: [],
      isActive: true,
      theme: {
        brandName: "GambChamp",
        primaryColor: "oklch(72% 0.18 258)",
        accentColor: "oklch(78% 0.16 160)",
      },
      featureFlags: {},
    },
  });

  // Users
  const adminHash = await bcrypt.hash("changeme", 10);
  const superHash = await bcrypt.hash("supersuper", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@gambchamp.local",
      passwordHash: adminHash,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "super@gambchamp.local",
      passwordHash: superHash,
      role: "SUPER_ADMIN",
      tenantId: tenant.id,
    },
  });
  // System user for cron-driven writes (expected by audit hash-chain)
  await prisma.user.create({
    data: {
      email: "system@gambchamp.local",
      passwordHash: "!",
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });

  // Subscription (Growth, 14-day trial)
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "growth",
      status: "TRIALING",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // Fraud policy — aggressive (global, singleton)
  await prisma.fraudPolicy.create({
    data: {
      name: "global",
      weightBlacklist: 60,
      weightGeoMismatch: 20,
      weightVoip: 25,
      weightDedupHit: 15,
      weightPatternHit: 15,
      autoRejectThreshold: 70,
      borderlineMin: 45,
      version: 1,
    },
  });

  // Blacklist — schema uses IP_EXACT | IP_CIDR | EMAIL_DOMAIN | PHONE_E164.
  // Blacklist is global (no tenantId).
  const blacklistIps = [
    "203.0.113.66",
    "203.0.113.77",
    "198.51.100.10",
    "198.51.100.22",
    "198.51.100.99",
    "185.220.100.1",
    "185.220.100.2",
    "185.220.101.1",
    "185.220.101.2",
    "91.219.237.244",
  ];
  for (const ip of blacklistIps) {
    await prisma.blacklist.create({ data: { kind: "IP_EXACT", value: ip } });
  }
  const blacklistEmailDomains = ["evil.io", "spam.io", "malware.io", "phish.io", "fraud.io"];
  for (const dom of blacklistEmailDomains) {
    await prisma.blacklist.create({ data: { kind: "EMAIL_DOMAIN", value: dom } });
  }
  const blacklistPhones = ["+12025550000", "+14155550000", "+447700900000"];
  for (const phone of blacklistPhones) {
    await prisma.blacklist.create({ data: { kind: "PHONE_E164", value: phone } });
  }

  // 5 Affiliates with varied configs
  const affiliates = await Promise.all(
    [
      {
        name: "North Traffic",
        contactEmail: "ops@north.traf",
        totalDailyCap: 2000,
        allowedGeo: ["US", "CA"],
      },
      {
        name: "Euro Affiliates",
        contactEmail: "hello@euro-aff.io",
        totalDailyCap: 3000,
        allowedGeo: ["DE", "FR", "IT", "ES", "PL", "AT", "UK"],
      },
      {
        name: "LATAM Partners",
        contactEmail: "team@latam.co",
        totalDailyCap: 1500,
        allowedGeo: ["BR", "MX", "AR", "CL", "CO"],
      },
      {
        name: "Asia Desk",
        contactEmail: "desk@asia-traffic.co",
        totalDailyCap: 2500,
        allowedGeo: ["JP", "KR", "HK", "SG", "AU"],
      },
      {
        name: "Dev Sandbox",
        contactEmail: "dev@gambchamp.local",
        totalDailyCap: 500,
        allowedGeo: [],
      },
    ].map(async (a) =>
      prisma.affiliate.create({
        data: {
          tenantId: tenant.id,
          name: a.name,
          contactEmail: a.contactEmail,
          totalDailyCap: a.totalDailyCap,
          isActive: true,
          postbackUrl: "http://localhost:4001/tracker?click_id={sub_id}&status={status}",
          postbackSecret: "demo-secret-" + a.name.toLowerCase().replace(/\W+/g, "-"),
          postbackEvents: ["lead_pushed", "ftd", "declined"],
          intakeSettings: {
            create: {
              requiredFields: ["email", "phone"],
              allowedGeo: a.allowedGeo,
              dedupeWindowDays: 30,
              maxRpm: 240,
            },
          },
        },
      }),
    ),
  );
  console.log("affiliates:", affiliates.length);

  // API keys — 2 per affiliate (1 prod, 1 sandbox), and 1 extra for the first affiliate
  const affiliateApiKeys: SeedResult["affiliateApiKeys"] = [];
  for (const aff of affiliates) {
    for (const variant of ["prod", "sandbox"] as const) {
      const rawKey = `ak_${randomBytes(24).toString("hex")}`;
      await prisma.apiKey.create({
        data: {
          tenantId: tenant.id,
          affiliateId: aff.id,
          keyHash: sha256(rawKey),
          keyPrefix: rawKey.slice(0, 12),
          label: `${aff.name} — ${variant}`,
          isSandbox: variant === "sandbox",
          isRevoked: false,
        },
      });
      affiliateApiKeys.push({ label: aff.name + "/" + variant, affiliateId: aff.id, apiKey: rawKey });
    }
  }

  // 6 Brokers with different GEOs, auth, caps, retry schedules, autologin + pendingHold
  const brokerSpecs = [
    {
      name: "Atlas Markets (US)",
      dailyCap: 1500,
      authType: "BEARER" as const,
      retrySchedule: "10,60,300,900",
      pendingHoldMinutes: 30,
      autologinEnabled: true,
    },
    {
      name: "Orion Trade (EU)",
      dailyCap: 2500,
      authType: "API_KEY_HEADER" as const,
      retrySchedule: "5,30,120,600,3600",
      pendingHoldMinutes: 45,
      autologinEnabled: true,
    },
    {
      name: "Nimbus FX (LATAM)",
      dailyCap: 1000,
      authType: "BASIC" as const,
      retrySchedule: "30,180,900,3600",
      pendingHoldMinutes: 20,
      autologinEnabled: false,
    },
    {
      name: "Titan Asia",
      dailyCap: 2000,
      authType: "NONE" as const,
      retrySchedule: "10,60,300,900,3600",
      pendingHoldMinutes: 60,
      autologinEnabled: true,
    },
    {
      name: "Vega Europe",
      dailyCap: 3000,
      authType: "BEARER" as const,
      retrySchedule: "10,60,300,900,3600",
      pendingHoldMinutes: 15,
      autologinEnabled: true,
    },
    {
      name: "Mock Echo",
      dailyCap: 10000,
      authType: "NONE" as const,
      retrySchedule: "10,60",
      pendingHoldMinutes: 0,
      autologinEnabled: false,
    },
  ];
  const brokers = [];
  for (const spec of brokerSpecs) {
    const b = await prisma.broker.create({
      data: {
        tenantId: tenant.id,
        name: spec.name,
        isActive: true,
        dailyCap: spec.dailyCap,
        endpointUrl: "https://postman-echo.com/post",
        httpMethod: "POST",
        headers: {},
        authType: spec.authType,
        authConfig: {},
        fieldMapping: {
          firstName: "first_name",
          lastName: "last_name",
          email: "email",
          phone: "phone",
          geo: "country",
        },
        staticPayload: {},
        responseIdPath: "id",
        postbackSecret: `postback-secret-${spec.name.replace(/\W+/g, "-").toLowerCase()}`,
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        statusMapping: {
          accepted: "ACCEPTED",
          declined: "DECLINED",
          ftd: "FTD",
          redeposit: "FTD",
        },
        syncMode: "webhook",
        retrySchedule: spec.retrySchedule,
        pendingHoldMinutes: spec.pendingHoldMinutes,
        autologinEnabled: spec.autologinEnabled,
        autologinLoginUrl: spec.autologinEnabled ? "https://login.example.com" : null,
      },
    });
    brokers.push(b);
  }
  console.log("brokers:", brokers.length);

  // Canonical statuses + per-broker mappings
  const canonicals = [
    { code: "new", category: "NEW" as const, sortOrder: 10 },
    { code: "pending_call", category: "NEW" as const, sortOrder: 20 },
    { code: "not_interested_yet", category: "NEW" as const, sortOrder: 30 },
    { code: "qualified", category: "QUALIFIED" as const, sortOrder: 100 },
    { code: "call_back", category: "QUALIFIED" as const, sortOrder: 110 },
    { code: "interested", category: "QUALIFIED" as const, sortOrder: 120 },
    { code: "demo_scheduled", category: "QUALIFIED" as const, sortOrder: 130 },
    { code: "rejected", category: "REJECTED" as const, sortOrder: 200 },
    { code: "declined", category: "REJECTED" as const, sortOrder: 210 },
    { code: "duplicate", category: "REJECTED" as const, sortOrder: 220 },
    { code: "fraud", category: "REJECTED" as const, sortOrder: 230 },
    { code: "invalid_phone", category: "REJECTED" as const, sortOrder: 240 },
    { code: "do_not_call", category: "REJECTED" as const, sortOrder: 250 },
    { code: "ftd", category: "CONVERTED" as const, sortOrder: 300 },
    { code: "redeposit", category: "CONVERTED" as const, sortOrder: 310 },
    { code: "active_trader", category: "CONVERTED" as const, sortOrder: 320 },
    { code: "high_value", category: "CONVERTED" as const, sortOrder: 330 },
    { code: "vip", category: "CONVERTED" as const, sortOrder: 340 },
    { code: "open", category: "NEW" as const, sortOrder: 40 },
    { code: "pending_contact", category: "NEW" as const, sortOrder: 50 },
  ];
  for (const c of canonicals) {
    await prisma.canonicalStatus.create({
      data: { code: c.code, label: c.code, category: c.category, sortOrder: c.sortOrder },
    });
  }
  // Status mappings per broker (a few per each)
  for (const b of brokers) {
    await prisma.statusMapping.createMany({
      data: [
        { brokerId: b.id, rawStatus: "accepted", canonicalStatusId: (await cs("qualified")) },
        { brokerId: b.id, rawStatus: "declined", canonicalStatusId: (await cs("declined")) },
        { brokerId: b.id, rawStatus: "ftd", canonicalStatusId: (await cs("ftd")) },
        { brokerId: b.id, rawStatus: "redeposit", canonicalStatusId: (await cs("redeposit")) },
        { brokerId: b.id, rawStatus: "call_back", canonicalStatusId: (await cs("call_back")) },
      ],
    });
  }

  // Proxy endpoints for autologin
  await prisma.proxyEndpoint.createMany({
    data: [
      {
        label: "BrightData US",
        provider: "brightdata",
        host: "brd.superproxy.io",
        port: 22225,
        username: "demo-user",
        password: "demo-pass",
        country: "US",
        isActive: true,
        lastHealthStatus: "healthy",
      },
      {
        label: "BrightData EU",
        provider: "brightdata",
        host: "brd.superproxy.io",
        port: 22225,
        username: "demo-user-eu",
        password: "demo-pass",
        country: "DE",
        isActive: true,
        lastHealthStatus: "degraded",
      },
    ],
  });

  // Broker payout rules — mix of CPA / CRG / RevShare.
  // crgRate + revShareRate are Decimal(5,4) — store as fractions (0.08 for 8%).
  await prisma.brokerPayoutRule.createMany({
    data: [
      {
        brokerId: brokers[0].id,
        kind: "CPA_FIXED",
        cpaAmount: new Prisma.Decimal("350.00"),
        activeFrom: new Date("2026-01-01"),
      },
      {
        brokerId: brokers[1].id,
        kind: "CPA_CRG",
        cpaAmount: new Prisma.Decimal("400.00"),
        crgRate: new Prisma.Decimal("0.0800"),
        minQualifiedDeposit: new Prisma.Decimal("250.00"),
        activeFrom: new Date("2026-01-01"),
      },
      {
        brokerId: brokers[2].id,
        kind: "REV_SHARE",
        revShareRate: new Prisma.Decimal("0.3000"),
        activeFrom: new Date("2026-01-01"),
      },
      {
        brokerId: brokers[3].id,
        kind: "HYBRID",
        cpaAmount: new Prisma.Decimal("200.00"),
        revShareRate: new Prisma.Decimal("0.1500"),
        activeFrom: new Date("2026-01-01"),
      },
      {
        brokerId: brokers[4].id,
        kind: "CPA_CRG",
        cpaAmount: new Prisma.Decimal("500.00"),
        crgRate: new Prisma.Decimal("0.1000"),
        minQualifiedDeposit: new Prisma.Decimal("500.00"),
        activeFrom: new Date("2026-01-01"),
      },
    ],
  });

  // Affiliate payout rules
  await prisma.affiliatePayoutRule.createMany({
    data: affiliates.slice(0, 4).map((a) => ({
      affiliateId: a.id,
      kind: "CPA_FIXED" as const,
      cpaAmount: new Prisma.Decimal(250),
      activeFrom: new Date("2026-01-01"),
    })),
  });

  // ─── Flow with rich graph ───────────────────────────────────────────
  // We build a graph with:
  //   Entry → Filter(EU) → Algorithm(WRR) → BrokerTarget(Orion, Vega) → Exit
  //         └─ Filter(US/CA) → Algorithm(Slots-Chance) → BrokerTarget(Atlas) → Exit
  //         └─ Filter(LATAM) → Algorithm(WRR) → BrokerTarget(Nimbus) → Exit
  //         └─ Filter(ASIA) → Algorithm(WRR) → BrokerTarget(Titan) → Exit
  //         └─ Fallback → Mock Echo → Exit
  const euAlgoId = "algo_eu";
  const usAlgoId = "algo_us";
  const latamAlgoId = "algo_latam";
  const asiaAlgoId = "algo_asia";

  const graph = {
    nodes: [
      { id: "entry", kind: "Entry" as const, label: "Entry" },
      // EU branch
      {
        id: "filter_eu",
        kind: "Filter" as const,
        label: "EU",
        conditions: [
          {
            field: "geo" as const,
            op: "in" as const,
            value: ["DE", "FR", "IT", "ES", "PL", "AT", "UK"],
          },
        ],
        logic: "AND" as const,
      },
      {
        id: euAlgoId,
        kind: "Algorithm" as const,
        label: "EU WRR",
        mode: "WEIGHTED_ROUND_ROBIN" as const,
      },
      {
        id: "bt_orion",
        kind: "BrokerTarget" as const,
        brokerId: brokers[1].id,
        weight: 3,
        label: "Orion",
      },
      {
        id: "bt_vega",
        kind: "BrokerTarget" as const,
        brokerId: brokers[4].id,
        weight: 1,
        label: "Vega",
      },
      // US/CA branch
      {
        id: "filter_us",
        kind: "Filter" as const,
        label: "US/CA",
        conditions: [{ field: "geo" as const, op: "in" as const, value: ["US", "CA"] }],
        logic: "AND" as const,
      },
      {
        id: usAlgoId,
        kind: "Algorithm" as const,
        label: "US Slots",
        mode: "SLOTS_CHANCE" as const,
      },
      {
        id: "bt_atlas",
        kind: "BrokerTarget" as const,
        brokerId: brokers[0].id,
        chance: 100,
        label: "Atlas",
      },
      // LATAM branch
      {
        id: "filter_latam",
        kind: "Filter" as const,
        label: "LATAM",
        conditions: [
          { field: "geo" as const, op: "in" as const, value: ["BR", "MX", "AR", "CL", "CO"] },
        ],
        logic: "AND" as const,
      },
      {
        id: latamAlgoId,
        kind: "Algorithm" as const,
        label: "LATAM WRR",
        mode: "WEIGHTED_ROUND_ROBIN" as const,
      },
      {
        id: "bt_nimbus",
        kind: "BrokerTarget" as const,
        brokerId: brokers[2].id,
        weight: 1,
        label: "Nimbus",
      },
      // ASIA branch
      {
        id: "filter_asia",
        kind: "Filter" as const,
        label: "ASIA",
        conditions: [
          { field: "geo" as const, op: "in" as const, value: ["JP", "KR", "HK", "SG", "AU"] },
        ],
        logic: "AND" as const,
      },
      {
        id: asiaAlgoId,
        kind: "Algorithm" as const,
        label: "ASIA WRR",
        mode: "WEIGHTED_ROUND_ROBIN" as const,
      },
      {
        id: "bt_titan",
        kind: "BrokerTarget" as const,
        brokerId: brokers[3].id,
        weight: 1,
        label: "Titan",
      },
      // Fallback
      {
        id: "fallback",
        kind: "Fallback" as const,
        label: "Last-resort",
        maxHop: 3,
      },
      {
        id: "bt_echo",
        kind: "BrokerTarget" as const,
        brokerId: brokers[5].id,
        weight: 1,
        label: "Echo",
      },
      { id: "exit", kind: "Exit" as const, label: "Exit" },
    ],
    edges: [
      { from: "entry", to: "filter_eu" },
      { from: "entry", to: "filter_us" },
      { from: "entry", to: "filter_latam" },
      { from: "entry", to: "filter_asia" },
      { from: "entry", to: "fallback" },
      // EU
      { from: "filter_eu", to: euAlgoId },
      { from: euAlgoId, to: "bt_orion" },
      { from: euAlgoId, to: "bt_vega" },
      { from: "bt_orion", to: "exit" },
      { from: "bt_vega", to: "exit" },
      // US
      { from: "filter_us", to: usAlgoId },
      { from: usAlgoId, to: "bt_atlas" },
      { from: "bt_atlas", to: "exit" },
      // LATAM
      { from: "filter_latam", to: latamAlgoId },
      { from: latamAlgoId, to: "bt_nimbus" },
      { from: "bt_nimbus", to: "exit" },
      // ASIA
      { from: "filter_asia", to: asiaAlgoId },
      { from: asiaAlgoId, to: "bt_titan" },
      { from: "bt_titan", to: "exit" },
      // Fallback
      { from: "fallback", to: "bt_echo" },
      { from: "bt_echo", to: "exit" },
    ],
  };

  const flow = await prisma.flow.create({
    data: {
      tenantId: tenant.id,
      name: "battle-mode-global",
      timezone: "UTC",
      status: "DRAFT",
      createdBy: admin.id,
      versions: {
        create: {
          versionNumber: 1,
          graph: graph as unknown as Prisma.InputJsonValue,
          algorithm: {} as Prisma.InputJsonValue,
          entryFilters: {} as Prisma.InputJsonValue,
          fallbackPolicy: {} as Prisma.InputJsonValue,
        },
      },
    },
    include: { versions: true },
  });

  const fv = flow.versions[0];

  // Caps — global daily (scope=FLOW), per-broker daily, per-country hourly on Orion.
  // scopeRefId is required by the unique key even when scope=FLOW; use flow id.
  await prisma.capDefinition.create({
    data: {
      flowVersionId: fv.id,
      scope: "FLOW",
      scopeRefId: flow.id,
      window: "DAILY",
      limit: 5000,
      timezone: "UTC",
    },
  });
  for (const b of brokers.slice(0, 5)) {
    await prisma.capDefinition.create({
      data: {
        flowVersionId: fv.id,
        scope: "BROKER",
        scopeRefId: b.id,
        window: "DAILY",
        limit: b.dailyCap ?? 1000,
        timezone: "UTC",
      },
    });
  }
  // Per-country cap on Orion (EU) — hourly
  const orionCountryCap = await prisma.capDefinition.create({
    data: {
      flowVersionId: fv.id,
      scope: "BROKER",
      scopeRefId: brokers[1].id,
      window: "HOURLY",
      limit: 200,
      timezone: "UTC",
      perCountry: true,
    },
  });
  await prisma.capCountryLimit.createMany({
    data: [
      { capDefId: orionCountryCap.id, country: "DE", limit: 80 },
      { capDefId: orionCountryCap.id, country: "FR", limit: 60 },
      { capDefId: orionCountryCap.id, country: "IT", limit: 40 },
      { capDefId: orionCountryCap.id, country: "ES", limit: 20 },
    ],
  });

  // Fallback steps — if primary BrokerTarget fails, try mock Echo next
  await prisma.fallbackStep.createMany({
    data: [
      {
        flowVersionId: fv.id,
        fromNodeId: "bt_orion",
        toNodeId: "bt_echo",
        hopOrder: 1,
        triggers: ["BROKER_FAILED", "CAP_REACHED"],
      },
      {
        flowVersionId: fv.id,
        fromNodeId: "bt_vega",
        toNodeId: "bt_echo",
        hopOrder: 1,
        triggers: ["BROKER_FAILED", "CAP_REACHED"],
      },
      {
        flowVersionId: fv.id,
        fromNodeId: "bt_atlas",
        toNodeId: "bt_echo",
        hopOrder: 1,
        triggers: ["BROKER_FAILED", "CAP_REACHED"],
      },
      {
        flowVersionId: fv.id,
        fromNodeId: "bt_nimbus",
        toNodeId: "bt_echo",
        hopOrder: 1,
        triggers: ["BROKER_FAILED", "CAP_REACHED"],
      },
      {
        flowVersionId: fv.id,
        fromNodeId: "bt_titan",
        toNodeId: "bt_echo",
        hopOrder: 1,
        triggers: ["BROKER_FAILED", "CAP_REACHED"],
      },
    ],
  });

  // Publish the flow
  await prisma.flow.update({
    where: { id: flow.id },
    data: { status: "PUBLISHED", activeVersionId: fv.id },
  });
  await prisma.flowVersion.update({
    where: { id: fv.id },
    data: { publishedAt: new Date(), publishedBy: admin.id },
  });

  // Rotation rules (legacy compat — also cover auto-migrate fallback path)
  await prisma.rotationRule.createMany({
    data: [
      { tenantId: tenant.id, geo: "DE", brokerId: brokers[1].id, priority: 1, isActive: true },
      { tenantId: tenant.id, geo: "FR", brokerId: brokers[4].id, priority: 1, isActive: true },
      { tenantId: tenant.id, geo: "US", brokerId: brokers[0].id, priority: 1, isActive: true },
      { tenantId: tenant.id, geo: "CA", brokerId: brokers[0].id, priority: 1, isActive: true },
      { tenantId: tenant.id, geo: "BR", brokerId: brokers[2].id, priority: 1, isActive: true },
      { tenantId: tenant.id, geo: "JP", brokerId: brokers[3].id, priority: 1, isActive: true },
    ],
  });

  // AdminApiKey — bonus: an admin-issued key for quick manual poking
  const adminKey = `ak_admin_${randomBytes(20).toString("hex")}`;
  await prisma.apiKey.create({
    data: {
      tenantId: tenant.id,
      affiliateId: affiliates[0].id,
      keyHash: sha256(adminKey),
      keyPrefix: adminKey.slice(0, 12),
      label: "admin-manual-test",
      isSandbox: false,
    },
  });

  return {
    tenantId: tenant.id,
    adminApiKey: adminKey,
    affiliateApiKeys,
    brokerIds: brokers.map((b) => b.id),
    flowId: flow.id,
  };

  async function cs(code: string): Promise<string> {
    const row = await prisma.canonicalStatus.findUnique({ where: { code } });
    if (!row) throw new Error("no canonical " + code);
    return row.id;
  }
}

async function main() {
  await requireConfirm();
  console.log("▶ wiping…");
  await wipe();
  console.log("▶ seeding…");
  const res = await seed();
  console.log("\n═══ DONE ═══");
  console.log("tenantId:", res.tenantId);
  console.log("admin / super creds: admin@gambchamp.local:changeme  super@gambchamp.local:supersuper");
  console.log("adminApiKey (manual):", res.adminApiKey);
  console.log("flowId:", res.flowId);
  console.log("brokers:", res.brokerIds.length);
  console.log("affiliate api keys:");
  for (const { label, apiKey } of res.affiliateApiKeys) {
    console.log("  ", label, apiKey);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
