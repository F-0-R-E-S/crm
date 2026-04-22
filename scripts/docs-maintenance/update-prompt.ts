import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { BLOCK_CATALOG } from "../docs-regen/block-catalog";

export interface UpdatePromptInput {
  block: string;
  diffText?: string;
  cwd?: string;
}

export async function buildUpdatePrompt(input: UpdatePromptInput): Promise<string> {
  const def = BLOCK_CATALOG.find((b) => b.id === input.block);
  if (!def) throw new Error(`Unknown block: ${input.block}`);
  const cwd = input.cwd ?? process.cwd();

  const humanFiles = await fg(`content/docs/${input.block}/*.mdx`, { cwd, absolute: true });
  const humanBlobs: string[] = [];
  for (const f of humanFiles) {
    const body = await readFile(f, "utf8");
    humanBlobs.push(`### ${rel(f, cwd)}\n\`\`\`mdx\n${body}\n\`\`\``);
  }

  const deepFiles = await fg(`content/docs/${input.block}/_deep/*.md`, { cwd, absolute: true });
  const deepBlobs: string[] = [];
  for (const f of deepFiles) {
    const body = await readFile(f, "utf8");
    const first800 = body.slice(0, 800);
    deepBlobs.push(`### ${rel(f, cwd)} (first 800 chars)\n\`\`\`\n${first800}\n\`\`\``);
  }

  return [
    "# Documentation update draft request",
    "",
    `## Block: ${input.block} — ${def.title}`,
    "",
    `_One-liner:_ ${def.oneLineDescription}`,
    "",
    "## Code diff",
    "",
    "```diff",
    input.diffText || "(no diff provided — inspect the repo at HEAD)",
    "```",
    "",
    "## Current human docs",
    "",
    humanBlobs.join("\n\n") || "_(no human docs yet — scaffold first)_",
    "",
    "## Current deep references",
    "",
    deepBlobs.join("\n\n") || "_(no deep references)_",
    "",
    "## Output format",
    "",
    "Propose a patch for ONLY the human layer. Respect these rules:",
    "- Keep each file's frontmatter untouched unless the title/description is stale.",
    '- Preserve existing anchors (`<a id="..." />`) — they may be linked from code.',
    "- Prefer surgical edits over rewrites.",
    "- If the diff is internal-only (no user-visible change), reply: `NO_DOC_UPDATE_NEEDED: <reason>`.",
    "",
    "Respond with one fenced `diff` block per changed file, or the NO_DOC_UPDATE_NEEDED sentinel.",
  ].join("\n");
}

function rel(abs: string, cwd: string) {
  return abs.startsWith(cwd) ? abs.slice(cwd.length + 1) : abs;
}

if (require.main === module) {
  const block = process.argv[2];
  if (!block) {
    console.error("usage: docs:update-prompt <block>");
    process.exit(2);
  }
  const diff = execSync("git diff origin/main...HEAD", { encoding: "utf8" });
  buildUpdatePrompt({ block, diffText: diff }).then((p) => process.stdout.write(p));
}
