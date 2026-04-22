import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface ScaffoldInput {
  id: string;
  title: string;
  order: number;
  oneLineDescription?: string;
  cwd?: string;
}

export async function scaffoldBlock(input: ScaffoldInput): Promise<string[]> {
  const cwd = input.cwd ?? process.cwd();
  const base = resolve(cwd, `content/docs/${input.id}`);
  const files: Array<[string, string]> = [
    [`${base}/index.mdx`, templateIndex(input)],
    [`${base}/how-to.mdx`, templateHowTo(input)],
    [`${base}/concepts.mdx`, templateConcepts(input)],
  ];
  const created: string[] = [];
  for (const [path, body] of files) {
    if (await exists(path)) continue;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body, "utf8");
    created.push(path);
  }
  return created;
}

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function templateIndex(i: ScaffoldInput): string {
  return [
    "---",
    "audience: human",
    `block: ${i.id}`,
    "source: hand",
    `title: "${i.title} — overview"`,
    `description: "${i.oneLineDescription ?? `Overview of ${i.title}.`}"`,
    "order: 1",
    "---",
    "",
    `# ${i.title}`,
    "",
    "_Fill in: 3-5 minute explanation of what this block does, who uses it, and why._",
    "",
    "## When to use",
    "",
    "## How it fits",
    "",
    "",
  ].join("\n");
}
function templateHowTo(i: ScaffoldInput): string {
  return [
    "---",
    "audience: human",
    `block: ${i.id}`,
    "source: hand",
    `title: "How to use ${i.title}"`,
    `description: "Concrete recipe — pick ONE common task and walk it end-to-end."`,
    "order: 2",
    "---",
    "",
    `# How to use ${i.title}`,
    "",
    "_Fill in: step-by-step recipe. Include at least one \\`\\`\\`bash or \\`\\`\\`ts snippet._",
    "",
    "## 1. ",
    "## 2. ",
    "## 3. ",
    "",
  ].join("\n");
}
function templateConcepts(i: ScaffoldInput): string {
  return [
    "---",
    "audience: human",
    `block: ${i.id}`,
    "source: hand",
    `title: "Concepts — ${i.title}"`,
    "order: 3",
    "---",
    "",
    `# Concepts — ${i.title}`,
    "",
    "_Fill in: terminology, edge cases, gotchas. Two-to-four H2 sections ideal._",
    "",
    "## ",
    "## ",
    "",
  ].join("\n");
}

if (require.main === module) {
  const id = process.argv[2];
  const title = process.argv[3] ?? id;
  if (!id) {
    console.error("usage: docs:scaffold <id> [title]");
    process.exit(2);
  }
  scaffoldBlock({ id, title, order: 99 }).then((c) => {
    console.log(`[docs:scaffold] created ${c.length} files:`);
    for (const p of c) console.log(`  ${p}`);
    console.log(
      "\nNext: add an entry to scripts/docs-regen/block-catalog.ts, then `pnpm docs:regen`.",
    );
  });
}
