import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { backfillDefaultOrg } from "../src/server/onboarding/backfill";
import type { FlowGraph } from "../src/server/routing/flow/model";
import { publishFlow } from "../src/server/routing/flow/publish";
import { createDraftFlow } from "../src/server/routing/flow/repository";

const prisma = new PrismaClient();

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function main() {
  // --- Admin user ---
  const adminHash = await bcrypt.hash("changeme", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gambchamp.local" },
    update: {},
    create: { email: "admin@gambchamp.local", passwordHash: adminHash, role: UserRole.ADMIN },
  });
  console.log(`admin: ${admin.email} / changeme`);

  // --- Test affiliate + API key ---
  const aff = await prisma.affiliate.upsert({
    where: { id: "seed-affiliate-1" },
    update: {},
    create: {
      id: "seed-affiliate-1",
      name: "Test Affiliate",
      contactEmail: "aff@example.com",
      totalDailyCap: 1000,
      postbackUrl:
        "http://localhost:4001/tracker?click_id={sub_id}&status={status}&payout={payout}",
      postbackEvents: ["lead_pushed", "ftd", "declined"],
    },
  });
  const rawKey = `ak_${randomBytes(24).toString("hex")}`;
  await prisma.apiKey.upsert({
    where: { keyHash: sha256(rawKey) },
    update: {},
    create: {
      affiliateId: aff.id,
      keyHash: sha256(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      label: "seed-key",
    },
  });
  console.log(`affiliate API key (SAVE — shown only here): ${rawKey}`);

  // --- Mock broker (points at local echo server started in tests) ---
  const broker = await prisma.broker.upsert({
    where: { id: "seed-broker-1" },
    update: {},
    create: {
      id: "seed-broker-1",
      name: "Mock Broker",
      dailyCap: 500,
      endpointUrl: "http://localhost:4000/push",
      fieldMapping: {
        firstName: "first_name",
        lastName: "last_name",
        email: "email",
        phone: "phone",
        geo: "country",
      },
      postbackSecret: "seed-secret-change-me",
      postbackLeadIdPath: "lead_id",
      postbackStatusPath: "status",
      statusMapping: { accepted: "ACCEPTED", declined: "DECLINED", ftd: "FTD" },
      responseIdPath: "id",
    },
  });

  await prisma.rotationRule.upsert({
    where: { geo_brokerId: { geo: "XX", brokerId: broker.id } },
    update: {},
    create: { geo: "XX", brokerId: broker.id, priority: 1 },
  });

  // --- Default global FraudPolicy ---
  await prisma.fraudPolicy.upsert({
    where: { name: "global" },
    update: {},
    create: { name: "global" },
  });
  console.log("fraud policy: global (defaults)");

  // --- EPIC-08 Autologin: seed one proxy endpoint ---
  if ((await prisma.proxyEndpoint.count()) === 0) {
    await prisma.proxyEndpoint.create({
      data: {
        label: "bd-us-residential-1",
        provider: "brightdata",
        host: "brd.superproxy.io",
        port: 22225,
        username: process.env.SEED_PROXY_USER ?? "demo-user",
        password: process.env.SEED_PROXY_PASS ?? "demo-pass",
        country: "US",
      },
    });
    console.log("proxy endpoint: bd-us-residential-1");
  }

  await backfillDefaultOrg();
  console.log("default org backfilled");

  if (process.env.SEED_PERF === "1") {
    await seedPerfFlow();
  }

  console.log("seed complete");
}

/**
 * Perf-harness fixtures for `perf/routing-stress.js`.
 * Creates:
 *   - 5 `perf-broker-0..4` rows
 *   - `flow-perf-default` flow + published version with a 5-way WRR algorithm + branch filter
 *   - `perf-affiliate` + `ak_perf_...` API key (printed to stdout once)
 * Idempotent: returns early if the flow already exists.
 */
async function seedPerfFlow(): Promise<void> {
  const existing = await prisma.flow.findFirst({ where: { name: "flow-perf-default" } });
  if (existing) {
    console.log("[perf] flow-perf-default already exists; skipping");
    return;
  }
  const brokers: { id: string; weight: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const broker = await prisma.broker.upsert({
      where: { id: `perf-broker-${i}` },
      update: {},
      create: {
        id: `perf-broker-${i}`,
        name: `perf-broker-${i}`,
        endpointUrl: "http://127.0.0.1:9/perf",
        fieldMapping: { firstName: "first_name", lastName: "last_name", email: "email" },
        postbackSecret: "perf-secret",
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        statusMapping: { accepted: "ACCEPTED", declined: "DECLINED" },
        responseIdPath: "id",
      },
    });
    brokers.push({ id: broker.id, weight: 10 + i });
  }
  const targets = brokers.map((b) => ({
    id: `t-${b.id}`,
    kind: "BrokerTarget" as const,
    brokerId: b.id,
    weight: b.weight,
  }));
  const graph: FlowGraph = {
    nodes: [
      { id: "e", kind: "Entry" },
      { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
      ...targets,
      { id: "x", kind: "Exit" },
    ],
    edges: [
      { from: "e", to: "a", condition: "default" },
      ...targets.map((t) => ({ from: "a", to: t.id, condition: "default" as const })),
      ...targets.map((t) => ({ from: t.id, to: "x", condition: "default" as const })),
    ],
  };
  const flow = await createDraftFlow({ name: "flow-perf-default", timezone: "UTC", graph });
  await publishFlow(flow.id, "system");

  const perfAff = await prisma.affiliate.upsert({
    where: { id: "perf-affiliate" },
    update: {},
    create: {
      id: "perf-affiliate",
      name: "perf-affiliate",
      contactEmail: "perf@example.com",
      totalDailyCap: 100000,
    },
  });
  const rawKey = `ak_perf_${randomBytes(16).toString("hex")}`;
  await prisma.apiKey.upsert({
    where: { keyHash: sha256(rawKey) },
    update: {},
    create: {
      affiliateId: perfAff.id,
      keyHash: sha256(rawKey),
      keyPrefix: rawKey.slice(0, 16),
      label: "perf-key",
    },
  });
  console.log(`[perf] flow ${flow.id} created; API key (SAVE): ${rawKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
