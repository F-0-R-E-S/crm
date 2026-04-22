import { execSync } from "node:child_process";
import { BLOCK_CATALOG } from "../docs-regen/block-catalog";
import { analyzeImpact } from "./impact";

export interface AuditOpts {
  compareAgainst?: string;
  changedPathsOverride?: string[];
  skipBlocks?: string[];
}

export interface AuditReport {
  violations: Array<{ block: string; reason: string; codePaths: string[] }>;
  skipped: string[];
  generatedAt: string;
}

export async function runAudit(opts: AuditOpts = {}): Promise<AuditReport> {
  const base = opts.compareAgainst ?? "origin/main";
  const paths = opts.changedPathsOverride ?? gitChangedPaths(base);
  const prismaModels = opts.changedPathsOverride ? [] : gitChangedPrismaModels(base);

  const impact = analyzeImpact({ changedPaths: paths, prismaChangedModels: prismaModels });
  const skip = new Set([
    ...(opts.skipBlocks ?? []),
    ...(process.env.NO_DOC_UPDATE_BLOCKS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ]);

  const violations: AuditReport["violations"] = [];
  for (const block of Object.keys(impact.codeChangedByBlock)) {
    if (skip.has(block)) continue;
    if (impact.humanDocsChangedByBlock[block]?.length) continue;
    const def = BLOCK_CATALOG.find((b) => b.id === block);
    if (!def) continue;
    violations.push({
      block,
      reason: `code changed (${impact.codeChangedByBlock[block].length} files) but no human-layer MDX updated in content/docs/${block}/`,
      codePaths: impact.codeChangedByBlock[block],
    });
  }
  return { violations, skipped: [...skip], generatedAt: new Date().toISOString() };
}

function gitChangedPaths(base: string): string[] {
  try {
    const out = execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function gitChangedPrismaModels(base: string): string[] {
  try {
    const out = execSync(`git diff ${base}...HEAD -- prisma/schema.prisma`, { encoding: "utf8" });
    const models = new Set<string>();
    for (const m of out.matchAll(/^[-+]\s*model\s+(\w+)\s*\{/gm)) models.add(m[1]);
    return [...models];
  } catch {
    return [];
  }
}

if (require.main === module) {
  runAudit().then((r) => {
    if (r.violations.length) {
      console.error(`[docs:audit] ${r.violations.length} blocks need human docs:`);
      for (const v of r.violations) {
        console.error(`  - ${v.block}: ${v.reason}`);
        for (const p of v.codePaths) console.error(`      ${p}`);
      }
      console.error("\nTo skip a block intentionally:");
      console.error("  NO_DOC_UPDATE_BLOCKS=<block1>,<block2> pnpm docs:audit");
      process.exit(1);
    }
    if (r.skipped.length) console.log(`[docs:audit] skipped blocks: ${r.skipped.join(", ")}`);
    console.log("[docs:audit] OK");
  });
}
