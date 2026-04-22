import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { BLOCK_CATALOG } from "./block-catalog";
import { extractEnv } from "./extractors/env";
import { extractErrors } from "./extractors/errors";
import { extractJobs } from "./extractors/jobs";
import { extractPrisma } from "./extractors/prisma";
import { extractRest } from "./extractors/rest";
import { extractTelegram } from "./extractors/telegram";
import { extractTrpc } from "./extractors/trpc";
import { renderInventory } from "./inventory";
import { renderDeepFile } from "./render";
import type { BlockId, BlockOutput, RegenManifest, RegenOptions, Section } from "./types";

export async function runDocsRegen(
  opts: RegenOptions,
): Promise<RegenManifest & { drift?: string[] }> {
  const cwd = opts.cwd;
  const [prisma, trpc, rest, env, errors, telegram, jobs] = await Promise.all([
    extractPrisma({ schemaPath: "prisma/schema.prisma", cwd }),
    extractTrpc({ routersDir: "src/server/routers", cwd }),
    extractRest({ appApiDir: "src/app/api", openapiYamlPath: "docs/api/v1/openapi.yaml", cwd }),
    extractEnv({ envFilePath: "src/lib/env.ts", cwd }),
    extractErrors({ srcDir: "src", cwd }),
    extractTelegram({
      catalogPath: "src/server/telegram/event-catalog.ts",
      templatesDir: "src/server/telegram/templates",
      cwd,
    }),
    extractJobs({ jobsDir: "src/server/jobs", cwd }),
  ]);

  const merged = new Map<BlockId, Record<Section["source"], Section[]>>();
  for (const b of BLOCK_CATALOG) {
    merged.set(b.id, {
      prisma: [],
      trpc: [],
      rest: [],
      env: [],
      errors: [],
      telegram: [],
      jobs: [],
      invariants: [],
    });
  }
  mergeInto(merged, prisma, "prisma");
  mergeInto(merged, trpc, "trpc");
  mergeInto(merged, rest, "rest");

  // env has a __shared__ key — broadcast its rows to every block
  const envCopy = new Map(env);
  const sharedEnv = envCopy.get("__shared__") ?? [];
  envCopy.delete("__shared__");
  mergeInto(merged, envCopy as Map<BlockId, Section[]>, "env");
  if (sharedEnv.length) {
    for (const block of merged.keys()) merged.get(block)!.env.push(...sharedEnv);
  }

  mergeInto(merged, errors, "errors");
  mergeInto(merged, telegram, "telegram");
  mergeInto(merged, jobs, "jobs");

  const blocksOut: BlockOutput[] = [];
  const drift: string[] = [];

  for (const b of BLOCK_CATALOG) {
    const bySource = merged.get(b.id)!;
    const sectionsAll: Section[] = [];
    for (const entry of Object.entries(bySource) as [Section["source"], Section[]][]) {
      const [source, sections] = entry;
      if (!sections.length) continue;
      sectionsAll.push(...sections);
      const relPath = `content/docs/${b.id}/_deep/${source}.md`;
      const absPath = resolve(cwd, relPath);
      const body = renderDeepFile({ block: b.id, source, sections });

      if (opts.mode === "write") {
        await mkdir(dirname(absPath), { recursive: true });
        await writeFile(absPath, body, "utf8");
      } else if (opts.mode === "check") {
        const existing = await readFileSafe(absPath);
        if (existing !== body) drift.push(relPath);
      }
    }
    blocksOut.push({ id: b.id, title: b.title, sections: sectionsAll });
  }

  const inventoryMd = renderInventory(
    blocksOut.map((bo) => ({
      id: bo.id,
      title: BLOCK_CATALOG.find((b) => b.id === bo.id)!.title,
      counts: tallyCounts(bo.sections),
    })),
  );
  if (opts.mode === "write") {
    await writeFile(resolve(cwd, "docs/feature-inventory.md"), inventoryMd, "utf8");
  } else if (opts.mode === "check") {
    const existing = await readFileSafe(resolve(cwd, "docs/feature-inventory.md"));
    if (existing !== inventoryMd) drift.push("docs/feature-inventory.md");
  }

  return {
    generatedAt: new Date().toISOString(),
    blocks: blocksOut,
    sourceCommit: null,
    ...(opts.mode === "check" ? { drift } : {}),
  };
}

function mergeInto(
  target: Map<BlockId, Record<Section["source"], Section[]>>,
  src: Map<string, Section[]>,
  key: Section["source"],
) {
  for (const [blockId, sections] of src) {
    if (!target.has(blockId)) continue;
    target.get(blockId)![key].push(...sections);
  }
}

async function readFileSafe(p: string): Promise<string | null> {
  try {
    return await readFile(p, "utf8");
  } catch {
    return null;
  }
}

function tallyCounts(sections: Section[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const s of sections) r[s.source] = (r[s.source] ?? 0) + 1;
  return r;
}

// CLI entry
if (require.main === module) {
  const mode: RegenOptions["mode"] = process.argv.includes("--check")
    ? "check"
    : process.argv.includes("--write")
      ? "write"
      : "dry";
  runDocsRegen({ mode, cwd: process.cwd() })
    .then((m: RegenManifest & { drift?: string[] }) => {
      console.log(`[docs-regen] mode=${mode} blocks=${m.blocks.length}`);
      if (mode === "check" && m.drift?.length) {
        console.error(`[docs-regen] DRIFT in ${m.drift.length} files:`);
        for (const d of m.drift) console.error(`  ${d}`);
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error("[docs-regen] failed:", e);
      process.exit(1);
    });
}
