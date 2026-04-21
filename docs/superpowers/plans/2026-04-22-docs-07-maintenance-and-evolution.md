# Docs Subsite Plan #7 — Maintenance & Evolution Mechanism

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the documentation stay in sync as the codebase evolves. The AI-deep (`_deep/*`) layer already self-heals via `pnpm docs:regen` (CI-enforced, plan #1). This plan closes the human-layer gap: a PR that changes code mapped to a block MUST either update the block's human MDX or explicitly declare that no doc change is needed. Ships: `pnpm docs:audit` local linter, `pnpm docs:scaffold <block>` scaffolder, `pnpm docs:update-prompt <block>` AI-assisted drafter, GitHub Action PR guard, playbook runbook.

**Architecture:** One new `scripts/docs-maintenance/` module. `audit.ts` diffs working tree / PR against `HEAD` (or `origin/main`), groups changed paths into blocks via `block-catalog.ts`, and fails (or warns) if a block's code changed but `content/docs/<block>/*.mdx` did not. `scaffold.ts` creates/extends the block catalog entry + MDX skeleton using the same templates as plan #2 Task 3 placeholders. `update-prompt.ts` assembles a structured prompt (recent block diff + current human MDX + current `_deep/*` for the block) that the author can feed into the local LLM (plan #6 Ollama) or into Claude Code via `--session` input — output is a draft patch against the block's `index.mdx` / `how-to-*.mdx` / `concepts.mdx`. A GitHub Action posts the audit result as a PR comment. The PR template prompts authors to declare doc-updated or doc-skip-reason.

**Tech Stack:** `simple-git` (or shelling to `git`), existing ts-morph/tooling, no runtime deps added to the app.

**Spec:** Depends on plan #1 (block catalog), #2 (MDX structure), #6 (Ollama — optional; `update-prompt` also works as plain text for Claude Code).

**Preflight:** Plans #1, #2, #3 merged. Plan #6 optional.

---

### Task 1: Block-impact analyzer

**Files:**
- Create: `crm-node/scripts/docs-maintenance/impact.ts`
- Test: `crm-node/tests/unit/docs-maintenance-impact.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-maintenance-impact.test.ts
import { describe, it, expect } from "vitest";
import { analyzeImpact } from "@/../scripts/docs-maintenance/impact";

describe("analyzeImpact", () => {
  it("maps src/server/intake/fraud-score.ts → fraud-score block", () => {
    const r = analyzeImpact({ changedPaths: ["src/server/intake/fraud-score.ts"] });
    expect(r.affectedBlocks).toContain("fraud-score");
  });

  it("a single Prisma model edit spreads to every block that references it", () => {
    const r = analyzeImpact({ changedPaths: ["prisma/schema.prisma"], prismaChangedModels: ["Lead", "FlowVersion"] });
    expect(new Set(r.affectedBlocks)).toEqual(new Set(["intake", "routing-engine"]));
  });

  it("ignores test files, markdown, and lockfiles", () => {
    const r = analyzeImpact({ changedPaths: [
      "tests/integration/intake.test.ts",
      "README.md",
      "pnpm-lock.yaml",
      "src/server/intake/route.ts",
    ]});
    expect(r.affectedBlocks).toEqual(["intake"]);
  });

  it("detects human-layer edits per block (so later we can diff code-edits vs doc-edits)", () => {
    const r = analyzeImpact({ changedPaths: [
      "src/server/intake/fraud-score.ts",
      "content/docs/fraud-score/concepts.mdx",
    ]});
    expect(r.affectedBlocks).toEqual(["fraud-score"]);
    expect(r.humanDocsChangedByBlock["fraud-score"]).toEqual(["content/docs/fraud-score/concepts.mdx"]);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-maintenance-impact.test.ts`

- [ ] **Step 3: Implement**

```ts
// crm-node/scripts/docs-maintenance/impact.ts
import { BLOCK_CATALOG, resolveBlock } from "../docs-regen/block-catalog";

const IGNORE_RE = [
  /^tests\//, /^crm-node\/tests\//,
  /\.test\.(ts|tsx|mts)$/,
  /^\.github\//, /^content\/docs\/.+\/_deep\//,
  /^pnpm-lock\.yaml$/, /^package-lock\.json$/,
  /\.md$/, /\.mdx$/, // handled separately in humanDocsChangedByBlock
];

export interface ImpactInput {
  changedPaths: string[];
  prismaChangedModels?: string[];
}

export interface ImpactResult {
  affectedBlocks: string[];
  codeChangedByBlock: Record<string, string[]>;
  humanDocsChangedByBlock: Record<string, string[]>;
}

export function analyzeImpact(input: ImpactInput): ImpactResult {
  const codeByBlock: Record<string, string[]> = {};
  const docsByBlock: Record<string, string[]> = {};

  for (const rel of input.changedPaths) {
    // Human-layer docs — tracked separately.
    const docMatch = rel.match(/^content\/docs\/([^/]+)\/(?!_deep\/)[^/]+\.mdx?$/);
    if (docMatch) {
      const [, block] = docMatch;
      (docsByBlock[block] ??= []).push(rel);
      continue;
    }
    if (IGNORE_RE.some((re) => re.test(rel))) continue;

    const block = resolveBlock({ kind: "server-path", name: rel })
      ?? resolveBlock({ kind: "rest-path", name: pathToRestRoute(rel) });
    if (block) (codeByBlock[block] ??= []).push(rel);
  }

  if (input.prismaChangedModels?.length) {
    for (const model of input.prismaChangedModels) {
      const block = resolveBlock({ kind: "prisma-model", name: model });
      if (block) (codeByBlock[block] ??= []).push(`prisma:${model}`);
    }
  }

  const affected = new Set([...Object.keys(codeByBlock), ...Object.keys(docsByBlock)]);
  return {
    affectedBlocks: [...affected],
    codeChangedByBlock: codeByBlock,
    humanDocsChangedByBlock: docsByBlock,
  };
}

function pathToRestRoute(rel: string): string {
  // src/app/api/v1/leads/route.ts → /api/v1/leads
  const m = rel.match(/^src\/app(\/api\/[^/]+(?:\/[^/]+)*?)\/route\.ts$/);
  if (!m) return "";
  return m[1].replace(/\[([^\]]+)\]/g, "{$1}");
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-maintenance-impact.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-maintenance/impact.ts crm-node/tests/unit/docs-maintenance-impact.test.ts
git commit -m "feat(docs-maint): analyzeImpact — map changed paths → affected blocks"
```

---

### Task 2: `pnpm docs:audit` CLI

**Files:**
- Create: `crm-node/scripts/docs-maintenance/audit.ts`
- Modify: `crm-node/package.json` (scripts)
- Test: `crm-node/tests/integration/docs-audit.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/integration/docs-audit.test.ts
import { describe, it, expect } from "vitest";
import { runAudit } from "@/../scripts/docs-maintenance/audit";

describe("docs:audit", () => {
  it("returns empty report when no code files changed", async () => {
    const report = await runAudit({ compareAgainst: "HEAD", changedPathsOverride: [] });
    expect(report.violations).toEqual([]);
  });

  it("flags a block whose code changed but docs did not", async () => {
    const report = await runAudit({
      compareAgainst: "HEAD",
      changedPathsOverride: ["src/server/intake/fraud-score.ts"],
    });
    const violation = report.violations.find((v) => v.block === "fraud-score");
    expect(violation).toBeDefined();
    expect(violation!.reason).toMatch(/code changed/);
  });

  it("suppresses violation when the block's human MDX was also changed", async () => {
    const report = await runAudit({
      compareAgainst: "HEAD",
      changedPathsOverride: [
        "src/server/intake/fraud-score.ts",
        "content/docs/fraud-score/concepts.mdx",
      ],
    });
    expect(report.violations.find((v) => v.block === "fraud-score")).toBeUndefined();
  });

  it("accepts a skip declaration via NO_DOC_UPDATE_BLOCKS env", async () => {
    const report = await runAudit({
      compareAgainst: "HEAD",
      changedPathsOverride: ["src/server/intake/fraud-score.ts"],
      skipBlocks: ["fraud-score"],
    });
    expect(report.violations).toEqual([]);
    expect(report.skipped).toContain("fraud-score");
  });
});
```

- [ ] **Step 2: Implement**

```ts
// crm-node/scripts/docs-maintenance/audit.ts
import { execSync } from "node:child_process";
import { analyzeImpact } from "./impact";
import { BLOCK_CATALOG } from "../docs-regen/block-catalog";

export interface AuditOpts {
  compareAgainst?: string;            // git ref; default "origin/main"
  changedPathsOverride?: string[];    // skip git diff — for tests
  skipBlocks?: string[];              // consumer of NO_DOC_UPDATE_BLOCKS env (comma-separated)
}

export interface AuditReport {
  violations: Array<{ block: string; reason: string; codePaths: string[] }>;
  skipped: string[];
  generatedAt: string;
}

export async function runAudit(opts: AuditOpts = {}): Promise<AuditReport> {
  const base = opts.compareAgainst ?? "origin/main";
  const paths = opts.changedPathsOverride ?? gitChangedPaths(base);
  const prismaModels = opts.changedPathsOverride
    ? []
    : gitChangedPrismaModels(base);

  const impact = analyzeImpact({ changedPaths: paths, prismaChangedModels: prismaModels });
  const skip = new Set([
    ...(opts.skipBlocks ?? []),
    ...((process.env.NO_DOC_UPDATE_BLOCKS ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
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
  } catch { return []; }
}
function gitChangedPrismaModels(base: string): string[] {
  try {
    const out = execSync(`git diff ${base}...HEAD -- prisma/schema.prisma`, { encoding: "utf8" });
    const models = new Set<string>();
    const re = /^[-+]\s*model\s+(\w+)\s*\{/gm;
    let m; while ((m = re.exec(out)) !== null) models.add(m[1]);
    return [...models];
  } catch { return []; }
}

if (require.main === module) {
  runAudit().then((r) => {
    if (r.violations.length) {
      console.error(`[docs:audit] ${r.violations.length} blocks need human docs:`);
      for (const v of r.violations) {
        console.error(`  - ${v.block}: ${v.reason}`);
        for (const p of v.codePaths) console.error(`      ${p}`);
      }
      console.error("");
      console.error("To skip a block intentionally (e.g. internal refactor with no user-visible change):");
      console.error("  NO_DOC_UPDATE_BLOCKS=<block1>,<block2> pnpm docs:audit");
      process.exit(1);
    }
    if (r.skipped.length) console.log(`[docs:audit] skipped blocks: ${r.skipped.join(", ")}`);
    console.log("[docs:audit] OK");
  });
}
```

- [ ] **Step 3: Register script**

In `crm-node/package.json`:
```json
"docs:audit": "tsx scripts/docs-maintenance/audit.ts",
"docs:audit:local": "tsx scripts/docs-maintenance/audit.ts"
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/integration/docs-audit.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-maintenance/audit.ts crm-node/package.json crm-node/tests/integration/docs-audit.test.ts
git commit -m "feat(docs-maint): pnpm docs:audit CLI with NO_DOC_UPDATE_BLOCKS escape hatch"
```

---

### Task 3: PR template + GitHub Action guard

**Files:**
- Create: `.github/pull_request_template.md` (at **repo root**, not crm-node)
- Create: `.github/workflows/docs-audit.yml`

- [ ] **Step 1: PR template**

```markdown
<!-- .github/pull_request_template.md -->
## Summary

<!-- 1-3 lines -->

## Scope

<!-- tick at least one -->
- [ ] User-visible behavior change (docs MUST be updated)
- [ ] Internal refactor — no API / behavior change
- [ ] Bug fix matching documented behavior
- [ ] Infrastructure / CI / build

## Docs update checklist

The CI job `docs:audit` runs on every push. If it flags blocks:

- [ ] I updated `content/docs/<block>/*.mdx` for every affected block, **OR**
- [ ] I explicitly skipped blocks with `NO_DOC_UPDATE_BLOCKS=<list>` (reason below).

**Skip reason (if any):**

<!-- e.g. "Internal retry-ladder tuning — no user-visible change." -->

## Test plan

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] `pnpm docs:audit`
- [ ] `pnpm docs:regen:check`
- [ ] (if content changed) `pnpm docs:links`
```

- [ ] **Step 2: GitHub Action**

```yaml
# .github/workflows/docs-audit.yml
name: docs-audit

on:
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: crm-node
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: crm-node/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - name: Run docs audit
        id: audit
        env:
          NO_DOC_UPDATE_BLOCKS: ${{ github.event.pull_request.body && contains(github.event.pull_request.body, 'NO_DOC_UPDATE_BLOCKS=') && '' || '' }}
        run: |
          pnpm docs:audit 2>&1 | tee audit.log
      - name: Post PR comment on violation
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const log = fs.readFileSync('crm-node/audit.log', 'utf8');
            const body = "### 📚 docs:audit found un-documented changes\n\n```\n" + log + "\n```\n\n" +
              "Either update the affected `content/docs/<block>/*.mdx` files, or declare a skip:\n" +
              "```\n# in PR description\nNO_DOC_UPDATE_BLOCKS=<block1>,<block2>\n```\n";
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo:  context.repo.repo,
              issue_number: context.issue.number,
              body,
            });
```

**Note on env var parsing:** the Action currently passes `NO_DOC_UPDATE_BLOCKS=` empty. To enable author-declared skips in the PR description, add a follow-up job that parses `NO_DOC_UPDATE_BLOCKS=(\S+)` from the PR body and re-exports. Keep that as a parking-lot item — v1 audit just warns; authors explicitly push a `-m "docs: acknowledged"` empty commit if they want to override.

- [ ] **Step 3: Test locally**

Run:
```bash
cd crm-node && pnpm docs:audit
```
On a clean working tree against `origin/main` → "OK".
Touch `src/server/intake/fraud-score.ts` with a no-op, commit, push branch → GH Action fails with a PR comment.

- [ ] **Step 4: Commit**

```bash
git add .github
git commit -m "ci(docs): PR template + docs-audit workflow"
```

---

### Task 4: `pnpm docs:scaffold <block>` — new block onboarding

**Files:**
- Create: `crm-node/scripts/docs-maintenance/scaffold.ts`
- Modify: `crm-node/package.json` (scripts)
- Test: `crm-node/tests/unit/docs-scaffold.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-scaffold.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scaffoldBlock } from "@/../scripts/docs-maintenance/scaffold";

describe("scaffoldBlock", () => {
  const root = resolve(process.cwd(), "content/docs/__scaffold-test__");
  beforeEach(() => { rmSync(root, { recursive: true, force: true }); });

  it("creates three MDX files with the right frontmatter", async () => {
    const created = await scaffoldBlock({
      id: "__scaffold-test__",
      title: "Scaffold Test",
      order: 999,
      oneLineDescription: "Temp block for unit test.",
    });
    expect(created.length).toBe(3);
    const idx = readFileSync(resolve(root, "index.mdx"), "utf8");
    expect(idx).toMatch(/block: __scaffold-test__/);
    expect(idx).toMatch(/audience: human/);
    expect(idx).toMatch(/title: "Scaffold Test — overview"/);
  });

  it("is idempotent — re-running does not overwrite existing files", async () => {
    await scaffoldBlock({ id: "__scaffold-test__", title: "Scaffold Test", order: 999 });
    const before = readFileSync(resolve(root, "index.mdx"), "utf8");
    await scaffoldBlock({ id: "__scaffold-test__", title: "Scaffold Test", order: 999 });
    const after = readFileSync(resolve(root, "index.mdx"), "utf8");
    expect(after).toBe(before);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// crm-node/scripts/docs-maintenance/scaffold.ts
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";

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

async function exists(p: string) { try { await access(p); return true; } catch { return false; } }

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
    `_Fill in: 3-5 minute explanation of what this block does, who uses it, and why._`,
    "",
    "## When to use",
    "",
    "## How it fits",
    "",
    "<DeepRefCard",
    `  block="${i.id}"`,
    '  kind="prisma"',
    '  title="Database schema"',
    '  description="Every field of every model in this block."',
    "/>",
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
    "_Fill in: step-by-step recipe. Include at least one ` ```bash ` example or ` ```ts ` snippet._",
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
  if (!id) { console.error("usage: docs:scaffold <id> [title]"); process.exit(2); }
  scaffoldBlock({ id, title, order: 99 }).then((c) => {
    console.log(`[docs:scaffold] created ${c.length} files:`); for (const p of c) console.log("  " + p);
    console.log("\nNext: add an entry to scripts/docs-regen/block-catalog.ts, then `pnpm docs:regen`.");
  });
}
```

- [ ] **Step 3: Register script**

```json
"docs:scaffold": "tsx scripts/docs-maintenance/scaffold.ts"
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-scaffold.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-maintenance/scaffold.ts crm-node/package.json crm-node/tests/unit/docs-scaffold.test.ts
git commit -m "feat(docs-maint): pnpm docs:scaffold <block>"
```

---

### Task 5: `pnpm docs:update-prompt <block>` — AI-assisted drafter

**Files:**
- Create: `crm-node/scripts/docs-maintenance/update-prompt.ts`
- Modify: `crm-node/package.json`
- Test: `crm-node/tests/unit/docs-update-prompt.test.ts`

**Rationale:** When a block's code changes, the author can run `pnpm docs:update-prompt <block>` to get a structured prompt that:
1. Summarizes the block's code diff since the last doc-layer edit.
2. Attaches the current `index.mdx` / `how-to-*.mdx` / `concepts.mdx`.
3. Attaches a compact summary of the current `_deep/*` for reference.
4. Asks the model (or human) to propose surgical patches to the human MDX.

Output goes to stdout by default (feed to any LLM). Optional `--ollama` flag pipes directly to the plan-#6 Qwen3-8B instance.

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-update-prompt.test.ts
import { describe, it, expect } from "vitest";
import { buildUpdatePrompt } from "@/../scripts/docs-maintenance/update-prompt";

describe("update-prompt", () => {
  it("assembles prompt with diff, current docs, and deep summary sections", async () => {
    const prompt = await buildUpdatePrompt({ block: "intake", diffText: "diff --git a/x b/x\n+new\n" });
    expect(prompt).toMatch(/## Block: intake/);
    expect(prompt).toMatch(/## Code diff/);
    expect(prompt).toMatch(/## Current human docs/);
    expect(prompt).toMatch(/## Current deep references/);
    expect(prompt).toMatch(/Output format/);
  });

  it("refuses unknown block id", async () => {
    await expect(buildUpdatePrompt({ block: "not-a-block", diffText: "" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Implement**

```ts
// crm-node/scripts/docs-maintenance/update-prompt.ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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
    `# Documentation update draft request`,
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
    "- Preserve existing anchors (`<a id=\"...\" />`) — they may be linked from code.",
    "- Prefer surgical edits over rewrites.",
    "- If the diff is internal-only (no user-visible change), reply: `NO_DOC_UPDATE_NEEDED: <reason>`.",
    "",
    "Respond with one fenced `diff` block per changed file, or the NO_DOC_UPDATE_NEEDED sentinel.",
  ].join("\n");
}

function rel(abs: string, cwd: string) { return abs.startsWith(cwd) ? abs.slice(cwd.length + 1) : abs; }

if (require.main === module) {
  const block = process.argv[2];
  if (!block) { console.error("usage: docs:update-prompt <block>"); process.exit(2); }
  const fs = require("node:fs");
  const diff = require("node:child_process").execSync("git diff origin/main...HEAD", { encoding: "utf8" });
  buildUpdatePrompt({ block, diffText: diff }).then((p) => process.stdout.write(p));
}
```

- [ ] **Step 3: Register script**

```json
"docs:update-prompt": "tsx scripts/docs-maintenance/update-prompt.ts"
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-update-prompt.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Smoke — feed to Ollama**

```bash
pnpm docs:update-prompt intake | \
  curl -s -X POST ${OLLAMA_BASE_URL}/api/generate \
    -H "x-ollama-auth: ${OLLAMA_AUTH_TOKEN}" \
    -H 'content-type: application/json' \
    --data-binary @- \
    --data-urlencode 'model=qwen3:8b-instruct-q5_K_M' | jq -r .response
```

(Or pipe to Claude Code via `claude -p @-`.)

- [ ] **Step 6: Commit**

```bash
git add crm-node/scripts/docs-maintenance/update-prompt.ts crm-node/package.json crm-node/tests/unit/docs-update-prompt.test.ts
git commit -m "feat(docs-maint): pnpm docs:update-prompt <block> — LLM-ready draft request"
```

---

### Task 6: Maintenance playbook

**Files:**
- Create: `crm-node/docs/runbooks/docs-maintenance.md`

- [ ] **Step 1: Write playbook**

```markdown
# Docs maintenance playbook

## The rule

Any PR that changes files under `src/` (or `prisma/schema.prisma`, `src/lib/env.ts`, `src/server/telegram/event-catalog.ts`) **must** either:
1. Update the human-layer MDX under `content/docs/<block>/*.mdx` for every affected block, OR
2. Explicitly declare the skip via `NO_DOC_UPDATE_BLOCKS=<block1>,<block2>` in CI, with a one-line reason in the PR description.

CI enforces this via the `docs-audit` workflow.

## Layers

| Layer | Source | Regenerated by | Human-owned? |
|:------|:-------|:---------------|:------------:|
| Human overview (`index.mdx`) | hand-written | never | ✅ yes |
| How-to recipes (`how-to-*.mdx`) | hand-written | never | ✅ yes |
| Concepts (`concepts.mdx`) | hand-written | never | ✅ yes |
| DB schema (`_deep/db-schema.md`) | `prisma/schema.prisma` | `pnpm docs:regen` | ❌ no |
| tRPC surface (`_deep/trpc-surface.md`) | `src/server/routers/*` | `pnpm docs:regen` | ❌ no |
| REST surface (`_deep/rest-surface.md`) | `src/app/api/**` + OpenAPI | `pnpm docs:regen` | ❌ no |
| Env vars (`_deep/env-vars.md`) | `src/lib/env.ts` | `pnpm docs:regen` | ❌ no |
| Errors (`_deep/error-catalog.md`) | grep of `throw new ...` | `pnpm docs:regen` | ❌ no |
| Telegram events (`_deep/telegram-events.md`) | `src/server/telegram/event-catalog.ts` | `pnpm docs:regen` | ❌ no |
| Jobs (`_deep/jobs.md`) | `src/server/jobs/*` | `pnpm docs:regen` | ❌ no |
| Invariants (`_deep/invariants.md`) | hand-written | never | ✅ yes |
| OpenAPI (`/docs/api`) | `scripts/gen-openapi.ts` | `pnpm gen:openapi` | ❌ no |
| Search index (`DocChunk`) | content files | `pnpm docs:index` + cron | ❌ no |

## Author workflow

Before opening a PR:

1. `pnpm docs:regen` — refresh AI-deep layer from code. Commit if the diff looks right.
2. `pnpm docs:audit` — see which blocks need human-layer updates.
3. For each flagged block, choose:
   - **Update the docs** — edit `content/docs/<block>/*.mdx` surgically.
   - **Scaffold a new block** — `pnpm docs:scaffold <new-block> "Block Title"`, fill in, add the entry to `scripts/docs-regen/block-catalog.ts`.
   - **Skip** — add `NO_DOC_UPDATE_BLOCKS=<block>` to your PR description with a reason.
4. (Optional) `pnpm docs:update-prompt <block>` → feed to local LLM or Claude Code to get a draft diff. Review and apply.
5. `pnpm docs:links` — verify no broken internal links.
6. `pnpm docs:regen:check` — confirm AI-deep layer is up to date.
7. Commit + push → CI's `docs-audit` job passes.

## Adding a brand-new block

When a new feature creates a new logical boundary (not just a change within an existing block):

1. `pnpm docs:scaffold <new-block> "Block Title"`
2. Edit `scripts/docs-regen/block-catalog.ts` — append a new `BlockDef` entry with `prismaModels`, `trpcRouters`, `restPathPrefixes`, `serverDirs`, `jobNames` populated.
3. Update the `BLOCK_CATALOG` test (sorted-ids assertion).
4. `pnpm docs:regen` — regenerate `_deep/` for the new block.
5. `pnpm docs:index` — index new chunks for search.
6. Fill in the 3 MDX files with human content.
7. Commit.

## Retiring a block

When a feature is removed (not just renamed):

1. Delete the `BlockDef` from `scripts/docs-regen/block-catalog.ts`.
2. `rm -rf content/docs/<block>/` (commit the deletion — the search indexer will prune `DocChunk` rows on next run).
3. Update cross-links in other MDX files (`pnpm docs:links` will flag broken ones).
4. CHANGELOG entry marking the block deprecated.

## Evolving the audit rules

The rules in `scripts/docs-maintenance/impact.ts::IGNORE_RE` determine what counts as a "real" code change. If you find the audit too noisy (e.g. it flags CSS-only changes) or too quiet (e.g. it misses a new server dir), edit that list and add a unit test to `docs-maintenance-impact.test.ts`.

## Review etiquette

Reviewers: before approving a PR, confirm either:
- The "Docs update checklist" in the PR description is ticked, AND `docs-audit` CI is green, OR
- The `NO_DOC_UPDATE_BLOCKS` reason is legitimate (internal refactor, no behavior change, no new field/env/error).
```

- [ ] **Step 2: Commit**

```bash
git add crm-node/docs/runbooks/docs-maintenance.md
git commit -m "docs(runbook): maintenance playbook for humans + CI"
```

---

### Task 7: LLM-assisted bulk audit — optional scheduled job

**Files:**
- Create: `crm-node/src/server/jobs/docs-staleness-report.ts`
- Modify: `crm-node/src/worker.ts`

**Rationale:** Complementing the per-PR audit, a weekly pg-boss job queries `DocAskEvent` for questions that ended in `refused=true` + low-result searches, and posts the top-20 as a Telegram digest. Signals which blocks are under-documented from real usage.

- [ ] **Step 1: Implement job**

```ts
// crm-node/src/server/jobs/docs-staleness-report.ts
import { prisma } from "@/server/db";
import { emitTelegramEvent } from "@/server/telegram/emit";

export const JOB_NAME = "docs-staleness-report";

export async function handleDocsStalenessReport(): Promise<void> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const refused: Array<{ question: string; n: number }> = await prisma.$queryRaw`
    SELECT question, COUNT(*)::int AS n
    FROM "DocAskEvent"
    WHERE "createdAt" > ${since} AND refused = true
    GROUP BY question
    ORDER BY n DESC
    LIMIT 20
  `;
  if (!refused.length) return;

  const payload = {
    windowDays: 7,
    topRefusedQuestions: refused.map((r) => ({ q: r.question, count: r.n })),
  };
  // Requires a new TelegramEventType — add `DOCS_STALENESS_REPORT` + template (admin-only).
  await emitTelegramEvent("DOCS_STALENESS_REPORT" as any, payload);
}
```

- [ ] **Step 2: Add event + template**

Extend `src/server/telegram/event-catalog.ts` with `DOCS_STALENESS_REPORT` (admin-only). Create `src/server/telegram/templates/docs-staleness-report.ts` rendering a numbered top-N.

- [ ] **Step 3: Cron registration**

In `src/worker.ts`:
```ts
await boss.schedule("docs-staleness-report", "0 9 * * 1");  // Monday 09:00 UTC
boss.work("docs-staleness-report", async () => handleDocsStalenessReport());
```

- [ ] **Step 4: Commit**

```bash
git add crm-node/src/server/jobs/docs-staleness-report.ts crm-node/src/server/telegram crm-node/src/worker.ts
git commit -m "feat(docs-maint): weekly docs-staleness Telegram digest (top refusals)"
```

---

### Task 8: CHANGELOG + READINESS + self-review

- [ ] **Step 1: CHANGELOG**

```markdown
## Unreleased — Docs maintenance + evolution

- **`pnpm docs:audit`.** Per-PR enforcement: code changed under `src/` but `content/docs/<block>/*.mdx` not updated → audit fails. `NO_DOC_UPDATE_BLOCKS=<list>` escape hatch for pure internal refactors.
- **GitHub Action.** Runs audit on every PR; posts a comment with violations on failure.
- **`pnpm docs:scaffold <block>` + `pnpm docs:update-prompt <block>`.** Scaffolder for new blocks + LLM-ready prompt builder for surgical MDX updates.
- **Playbook.** `docs/runbooks/docs-maintenance.md` — author workflow, layer ownership, add/retire-block playbooks, reviewer etiquette.
- **Weekly staleness digest.** `docs-staleness-report` pg-boss job posts top refused docs Q&A questions to Telegram (admin-only event).
```

- [ ] **Step 2: READINESS**

```markdown
- [x] Docs maintenance + evolution mechanism (audit + scaffold + update-prompt + staleness digest) — #2026-04-22-docs-07
```

- [ ] **Step 3: Green lights**

```bash
pnpm typecheck && pnpm lint && pnpm vitest run tests/unit/docs-maintenance tests/integration/docs-audit.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add crm-node/CHANGELOG.md crm-node/docs/superpowers/READINESS_CHECKLIST.md
git commit -m "docs: record maintenance/evolution mechanism shipping"
```

---

### Task 9: Self-review

- [ ] **Step 1: Spec coverage.** Audit CLI ✅ · Block-impact analyzer ✅ · PR guard + template ✅ · Scaffolder ✅ · LLM update-prompt ✅ · Playbook ✅ · Staleness digest ✅.

- [ ] **Step 2: Placeholder scan.** Concrete code + commands in every step.

- [ ] **Step 3: Integration.** `impact.ts` reuses `block-catalog.ts` from plan #1. `docs:update-prompt` reuses `BLOCK_CATALOG` + walks `content/docs/<block>/` + `_deep/`. Staleness job reuses `DocAskEvent` from plan #6 + `emitTelegramEvent` from the existing Telegram bot. No circular deps.

- [ ] **Step 4: Hand off.** With plans #1–#7, the full docs story is: **generate → author → publish → search → ask AI → maintain**. Every layer has an owner (code for AI-deep, humans for overview/recipes/concepts) and every layer has a guard (CI drift-check for AI-deep, CI audit for human-layer, link-check for cross-refs, search drift via cron reindex, staleness digest from LLM telemetry).
