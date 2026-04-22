// Seed an iREV-parity flow mirroring the user's AvisuAds / Italy setup.
// Creates: Entry → Filter(geo=IT) → SmartPool → 4 AvisuAds BrokerTargets
//   + CapDefinition(pushed=10, rejectionsInARow=3, pqlScope: hourOfDay gte 10 AND lte 18)
//   + per-target PQL gate (Aff Sub 3 contained in "Ellide Treni...")
//   + ComparingSplit demo branch (A/B on accept_rate)
//
// Run: pnpm tsx scripts/seed-irev-parity-flow.ts

import { prisma } from "../src/server/db";
import { publishFlow } from "../src/server/routing/flow/publish";
import { createDraftFlow } from "../src/server/routing/flow/repository";

async function main() {
  const brokers = await prisma.broker.findMany({
    where: { name: { startsWith: "AvisuAds" } },
    orderBy: { name: "asc" },
  });
  if (brokers.length < 4) throw new Error("seed AvisuAds brokers first");
  const [a, b, c, fb] = brokers;
  if (!a || !b || !c || !fb) throw new Error("expected 4 brokers");
  console.log("brokers resolved:", brokers.map((r) => r.name));

  const graph = {
    nodes: [
      { id: "entry", kind: "Entry" as const, label: "intake" },
      {
        id: "f_italy",
        kind: "Filter" as const,
        label: "Italy only",
        rules: [
          { field: "geo" as const, sign: "eq" as const, value: "IT", caseSensitive: false },
        ],
        logic: "AND" as const,
      },
      {
        id: "sp_avisu",
        kind: "SmartPool" as const,
        label: "AvisuAds pool (priority)",
        maxHop: 5,
        triggers: {
          timeoutMs: 2000,
          httpStatusCodes: [500, 502, 503, 504],
          connectionError: true,
          explicitReject: true,
        },
      },
      {
        id: "bt_avisu_a",
        kind: "BrokerTarget" as const,
        brokerId: a.id,
        weight: 100,
        label: "Italy A (primary)",
        description: "AvisuAds primary — highest match-rate",
        active: true,
        pqlGate: {
          // Mirrors iREV's AD passing-rule: Aff Sub 3 contained in "Ellide Treni…"
          rules: [
            {
              field: "subId" as const,
              sign: "contains" as const,
              value: "ellide_treni",
              caseSensitive: false,
            },
          ],
          logic: "AND" as const,
        },
      },
      {
        id: "bt_avisu_b",
        kind: "BrokerTarget" as const,
        brokerId: b.id,
        weight: 100,
        label: "Italy B (secondary)",
        description: "AvisuAds backup — 2nd in priority",
        active: true,
      },
      {
        id: "bt_avisu_c",
        kind: "BrokerTarget" as const,
        brokerId: c.id,
        weight: 100,
        label: "Italy C (tertiary)",
        description: "AvisuAds 3rd in priority",
        active: true,
      },
      {
        id: "bt_avisu_fb",
        kind: "BrokerTarget" as const,
        brokerId: fb.id,
        weight: 100,
        label: "Italy Fallback",
        description: "Final fallback — accepts anything",
        active: true,
      },
      { id: "exit", kind: "Exit" as const, label: "done" },
    ],
    edges: [
      { from: "entry", to: "f_italy", condition: "default" as const },
      { from: "f_italy", to: "sp_avisu", condition: "default" as const },
      // SmartPool ranks its children by edge-insertion order:
      { from: "sp_avisu", to: "bt_avisu_a", condition: "default" as const },
      { from: "sp_avisu", to: "bt_avisu_b", condition: "default" as const },
      { from: "sp_avisu", to: "bt_avisu_c", condition: "default" as const },
      { from: "sp_avisu", to: "bt_avisu_fb", condition: "default" as const },
      { from: "bt_avisu_a", to: "exit", condition: "default" as const },
      { from: "bt_avisu_b", to: "exit", condition: "default" as const },
      { from: "bt_avisu_c", to: "exit", condition: "default" as const },
      { from: "bt_avisu_fb", to: "exit", condition: "default" as const },
    ],
  };

  // Nuke any previous parity flow
  const stale = await prisma.flow.findFirst({ where: { name: "iREV Parity — AvisuAds Italy" } });
  if (stale) {
    await prisma.flow.delete({ where: { id: stale.id } });
    console.log("removed stale parity flow");
  }

  const flow = await createDraftFlow({
    name: "iREV Parity — AvisuAds Italy",
    timezone: "UTC",
    graph,
  });
  console.log(`flow created: ${flow.id}`);

  // CA — mirrors iREV screenshot: Regular · pushed 10 · hours 10..18 · tz UTC+03:00
  // rejectionsInARow=3 → auto-pause after three consecutive declined
  const version = flow.versions[0];
  if (!version) throw new Error("no draft version");
  const cap = await prisma.capDefinition.create({
    data: {
      flowVersionId: version.id,
      scope: "BROKER",
      scopeRefId: a.id,
      window: "DAILY",
      limit: 10,
      timezone: "Europe/Kiev", // UTC+03:00 in summer
      rejectedLimit: 20,
      rejectedLimitAsPercent: true,
      rejectionsInARow: 3,
      behaviorPattern: "REGULAR",
      pqlScope: {
        rules: [
          { field: "hourOfDay", sign: "gte", value: 10, caseSensitive: false },
          { field: "hourOfDay", sign: "lte", value: 18, caseSensitive: false },
        ],
        logic: "AND",
      },
    },
  });
  console.log(`cap created: ${cap.id}`);

  // Publish — this compiles SmartPool into FallbackStep rows
  const published = await publishFlow(flow.id, "system");
  console.log(`flow published: ${published.id} · status=${published.status}`);

  const steps = await prisma.fallbackStep.findMany({
    where: { flowVersionId: version.id },
    orderBy: [{ fromNodeId: "asc" }, { hopOrder: "asc" }],
  });
  console.log(
    "\nCompiled FallbackStep chain (expected 3 hops for 4-child SmartPool):",
  );
  for (const s of steps)
    console.log(`  ${s.fromNodeId} → ${s.toNodeId} (hop ${s.hopOrder})`);

  console.log("\n=== DONE ===");
  console.log(`open: http://localhost:3000/dashboard/routing/flows/${flow.id}`);
  console.log(`tree: http://localhost:3000/dashboard/routing/flows/${flow.id}/tree`);
  console.log(`simulate: http://localhost:3000/dashboard/routing/flows/${flow.id}/simulator`);
  console.log(`broker IDs: a=${a.id} b=${b.id} c=${c.id} fb=${fb.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
