/**
 * One-off script: scaffold placeholder human MDX pages for each block.
 * Idempotent — skips files that already exist.
 *
 * Usage: pnpm tsx scripts/docs-maintenance/scaffold-placeholders.ts
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BLOCK_CATALOG } from "../docs-regen/block-catalog";

const ROOT = join(process.cwd(), "content/docs");

let created = 0;
let skipped = 0;

for (const block of BLOCK_CATALOG) {
  const dir = join(ROOT, block.id);
  const file = join(dir, "index.mdx");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (existsSync(file)) {
    skipped++;
    continue;
  }

  const content = `---
audience: human
block: ${block.id}
source: hand
title: "${block.title} — overview"
description: "Public placeholder page; replaced in docs plan #3."
order: 1
---

# ${block.title}

_Coming soon: overview of the block._
`;

  writeFileSync(file, content, "utf8");
  created++;
  console.log(`created: ${file}`);
}

console.log(`\ndone — created: ${created}, skipped: ${skipped}`);
