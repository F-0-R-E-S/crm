// CLI wrapper for the Filter→PQL data migration.
//
// Usage:
//   pnpm tsx scripts/migrate-filter-to-pql.ts          # apply
//   pnpm tsx scripts/migrate-filter-to-pql.ts --dry-run
//
// The migration is idempotent — safe to re-run. FlowVersions already
// in the canonical shape are no-ops.

import { prisma } from "../src/server/db";
import { runFilterToPqlMigration } from "../src/server/routing/flow/migrations/2026-04-22-filter-to-pql";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const report = await runFilterToPqlMigration({ prisma, dryRun });
  console.log(
    JSON.stringify(
      {
        dryRun,
        flowVersionsScanned: report.flowVersionsScanned,
        flowVersionsRewritten: report.flowVersionsRewritten,
        filterNodesRewritten: report.filterNodesRewritten,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
