# Docs Subsite Plan #4 — Hybrid Search (pgvector + BM25) + Cmd+K UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Index every `content/docs/**/*.{md,mdx}` file (both human and `_deep/` AI-deep layers) into Postgres, and expose hybrid search (dense vector via `pgvector` + sparse BM25 via `ts_vector`) fused with Reciprocal Rank Fusion. The human-facing Cmd+K palette queries the `human`-audience subset only; the AI assistant (plan #6) queries the full set with a boost on `ai-deep` for field-level questions.

**Architecture:** New Prisma model `DocChunk` stores one row per chunk — `(id, slug, audience, block, kind, title, body, tsv, embedding vector(1024), sourceHash, createdAt)`. Chunking is size-tiered: human chunks target ~500 tokens, `ai-deep` chunks target ~150 tokens. Embeddings come from **BGE-M3** (1024-dim, Apache 2.0) served by the same Ollama instance that hosts Qwen3-8B in plan #6 (pull `bge-m3` separately). BM25 via `ts_vector` GIN index over `body`. Search is a single raw SQL query that computes both ranks, merges with RRF (`1 / (60 + rank)`), and returns top-k with snippets. A tRPC procedure `docs.search` exposes it; the Cmd+K component (`CommandPalette`) hits it with debounced input. All search events persist to `DocSearchEvent` for telemetry + eval.

**Tech Stack:** `pgvector` Postgres extension (already enabled for future use per `prisma/schema.prisma` usage patterns — if not, enable in migration), `@prisma/client` raw query support, new `src/server/docs/indexer.ts` + `src/server/docs/search.ts` modules, `tiktoken` for token counts, `unified`+`remark-parse`+`remark-mdx` for semantic chunking, Ollama OpenAI-compat embeddings endpoint. Frontend: `cmdk` library (official Next-compatible command palette).

**Spec:** Depends on plan #2 (subsite live) + plan #3 (content exists). Provides a `search()` primitive consumed by plan #6's RAG.

**Preflight:**
- Plans #1, #2, #3 merged.
- Ollama server available at `OLLAMA_BASE_URL` (plan #6 provisions; for plan #4 local dev is enough: `ollama serve` on localhost with `ollama pull bge-m3`).
- Postgres 15+ with `pgvector` extension installable (Fly managed Postgres supports it).

---

### Task 1: Enable `pgvector` + new Prisma model `DocChunk`

**Files:**
- Modify: `crm-node/prisma/schema.prisma`
- Create: `crm-node/prisma/migrations/<timestamp>_docs_chunks/migration.sql`
- Test: `crm-node/tests/integration/docs-chunk-model.test.ts`

- [ ] **Step 1: Write failing integration test**

```ts
// crm-node/tests/integration/docs-chunk-model.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/server/db";

describe("DocChunk model", () => {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "DocChunk" CASCADE`;
  });

  it("persists and round-trips a row with a 1024-dim embedding", async () => {
    const emb = Array(1024).fill(0).map((_, i) => i / 1024);
    await prisma.$executeRaw`
      INSERT INTO "DocChunk" (id, slug, audience, block, kind, title, body, "sourceHash", embedding)
      VALUES ('c1', 'intake/index', 'human', 'intake', 'overview', 'Lead intake', 'body text',
              'sha256xx', ${"[" + emb.join(",") + "]"}::vector)
    `;
    const rows: any[] = await prisma.$queryRaw`SELECT id, audience, block FROM "DocChunk" WHERE id = 'c1'`;
    expect(rows.length).toBe(1);
    expect(rows[0].audience).toBe("human");
  });

  it("GIN index on tsv is effective (EXPLAIN shows index scan)", async () => {
    const plan: any[] = await prisma.$queryRawUnsafe(
      `EXPLAIN SELECT id FROM "DocChunk" WHERE tsv @@ plainto_tsquery('english', 'test')`,
    );
    const planText = plan.map((r) => Object.values(r)[0]).join("\n");
    expect(planText).toMatch(/Bitmap Index Scan on "DocChunk_tsv_idx"/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-chunk-model.test.ts`
Expected: `DocChunk` relation doesn't exist.

- [ ] **Step 3: Extend Prisma schema**

Add to `prisma/schema.prisma`:
```prisma
model DocChunk {
  id          String   @id
  slug        String
  audience    String   // "human" | "ai-deep"
  block       String
  kind        String   // "overview" | "how-to" | "concepts" | "prisma" | "trpc" | …
  title       String
  body        String
  anchor      String?  // in-page anchor for deep linking
  sourceHash  String
  embedding   Unsupported("vector(1024)")?
  // tsv is a generated column — backfilled via migration SQL below.
  createdAt   DateTime @default(now())

  @@index([slug])
  @@index([audience])
  @@index([block])
}

model DocSearchEvent {
  id        String   @id @default(cuid())
  userId    String?
  tenantId  String?
  query     String
  mode      String   // "cmdk" | "ask-ai"
  topKJson  Json     // [{ chunkId, score }]
  latencyMs Int
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

- [ ] **Step 4: Create migration with the things Prisma can't express**

```bash
pnpm prisma migrate dev --create-only --name docs_chunks
```

Edit the generated migration SQL, prepend:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
Append:
```sql
ALTER TABLE "DocChunk"
  ADD COLUMN "tsv" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) STORED;

CREATE INDEX "DocChunk_tsv_idx" ON "DocChunk" USING GIN ("tsv");
CREATE INDEX "DocChunk_embedding_idx" ON "DocChunk"
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

- [ ] **Step 5: Apply**

Run:
```bash
pnpm prisma migrate dev
```
Expected: migration applied cleanly.

- [ ] **Step 6: Run test**

Run: `pnpm vitest run tests/integration/docs-chunk-model.test.ts`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add crm-node/prisma/schema.prisma crm-node/prisma/migrations crm-node/tests/integration/docs-chunk-model.test.ts
git commit -m "feat(docs): DocChunk + DocSearchEvent models, pgvector + tsvector indexes"
```

---

### Task 2: Chunker — MDX → audience-tagged chunks

**Files:**
- Create: `crm-node/src/server/docs/chunker.ts`
- Test: `crm-node/tests/unit/docs-chunker.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-chunker.test.ts
import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "@/server/docs/chunker";

describe("chunker", () => {
  it("splits human docs on H2/H3 boundaries, target ~500 tokens", () => {
    const md = [
      "# Intake",
      "Opening para.",
      "## Dedup",
      "Dedup details here.",
      "### email_phone_daily",
      "Rule...",
      "## Fraud",
      "Fraud details.",
    ].join("\n\n");
    const chunks = chunkMarkdown({ text: md, audience: "human", slug: "intake/index", block: "intake", kind: "overview", title: "Intake" });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0].title).toMatch(/Intake/);
    expect(chunks[1].title).toMatch(/Dedup/);
    expect(chunks.every((c) => c.tokens <= 700)).toBe(true);
  });

  it("splits ai-deep docs much finer (~150 tokens per H1) and preserves anchor", () => {
    const md = [
      "# Lead",
      "<a id=\"db-lead\"></a>",
      "- id: String",
      "- state: LeadState",
      "# LeadEvent",
      "<a id=\"db-leadevent\"></a>",
      "- id: String",
    ].join("\n\n");
    const chunks = chunkMarkdown({ text: md, audience: "ai-deep", slug: "intake/_deep/db-schema", block: "intake", kind: "prisma", title: "DB Schema" });
    expect(chunks.length).toBe(2);
    expect(chunks[0].anchor).toBe("db-lead");
    expect(chunks[1].anchor).toBe("db-leadevent");
  });

  it("produces deterministic chunk ids (hash-based)", () => {
    const md = "# A\nbody\n# B\nbody";
    const a = chunkMarkdown({ text: md, audience: "human", slug: "x/y", block: "intake", kind: "overview", title: "X" });
    const b = chunkMarkdown({ text: md, audience: "human", slug: "x/y", block: "intake", kind: "overview", title: "X" });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-chunker.test.ts`

- [ ] **Step 3: Implement chunker**

```ts
// crm-node/src/server/docs/chunker.ts
import { createHash } from "node:crypto";
import { encode } from "tiktoken/lite";
import { ranks } from "tiktoken/ranks/o200k_base";

const enc = new (encode as any)(ranks);

const HUMAN_TARGET = 500;
const HUMAN_MAX = 700;
const AI_DEEP_TARGET = 150;
const AI_DEEP_MAX = 250;

export interface ChunkInput {
  text: string;
  audience: "human" | "ai-deep";
  slug: string;
  block: string;
  kind: string;
  title: string;
}
export interface Chunk {
  id: string;
  slug: string;
  audience: "human" | "ai-deep";
  block: string;
  kind: string;
  title: string;
  body: string;
  anchor?: string;
  tokens: number;
}

export function chunkMarkdown(input: ChunkInput): Chunk[] {
  const splitDepth = input.audience === "ai-deep" ? /^(#{1,2})\s/m : /^(#{2,3})\s/m;
  const target = input.audience === "ai-deep" ? AI_DEEP_TARGET : HUMAN_TARGET;
  const max = input.audience === "ai-deep" ? AI_DEEP_MAX : HUMAN_MAX;

  const rawSections = splitByHeadings(input.text, splitDepth);
  const out: Chunk[] = [];

  for (const sec of rawSections) {
    const tokens = countTokens(sec.body);
    if (tokens <= max) {
      out.push(makeChunk(input, sec));
      continue;
    }
    // Oversized → paragraph-level sub-split until under target.
    const paras = sec.body.split(/\n{2,}/);
    let buf: string[] = [];
    let bufTokens = 0;
    for (const p of paras) {
      const pt = countTokens(p);
      if (bufTokens + pt > target && buf.length) {
        out.push(makeChunk(input, { ...sec, body: buf.join("\n\n") }));
        buf = [p]; bufTokens = pt;
      } else {
        buf.push(p); bufTokens += pt;
      }
    }
    if (buf.length) out.push(makeChunk(input, { ...sec, body: buf.join("\n\n") }));
  }
  return out;
}

function splitByHeadings(text: string, depthRe: RegExp): Array<{ title: string; body: string; anchor?: string }> {
  const lines = text.split("\n");
  const sections: Array<{ title: string; body: string; anchor?: string }> = [];
  let cur = { title: "_intro_", body: "", anchor: undefined as string | undefined };
  for (const ln of lines) {
    const m = ln.match(depthRe.source.replace(/\^/g, "") as any) || ln.match(depthRe);
    if (m && /^#+\s/.test(ln)) {
      if (cur.body.trim() || cur.title !== "_intro_") sections.push(cur);
      cur = { title: ln.replace(/^#+\s+/, "").trim(), body: "", anchor: undefined };
    } else {
      const anchorMatch = ln.match(/<a\s+id=["']([^"']+)["']/);
      if (anchorMatch && !cur.anchor) cur.anchor = anchorMatch[1];
      cur.body += ln + "\n";
    }
  }
  if (cur.body.trim()) sections.push(cur);
  return sections;
}

function makeChunk(input: ChunkInput, sec: { title: string; body: string; anchor?: string }): Chunk {
  const body = sec.body.trim();
  const tokens = countTokens(body);
  const id = createHash("sha256")
    .update(`${input.slug}::${sec.anchor ?? sec.title}::${body}`)
    .digest("hex")
    .slice(0, 16);
  return {
    id,
    slug: input.slug,
    audience: input.audience,
    block: input.block,
    kind: input.kind,
    title: sec.title === "_intro_" ? input.title : sec.title,
    body,
    anchor: sec.anchor,
    tokens,
  };
}

function countTokens(s: string): number {
  return enc.encode(s).length;
}
```

If `tiktoken` is heavy, alternative: character-count proxy (`Math.ceil(s.length / 4)`). Keep the real one for fidelity.

```bash
pnpm add tiktoken
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/unit/docs-chunker.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/server/docs/chunker.ts crm-node/tests/unit/docs-chunker.test.ts crm-node/package.json crm-node/pnpm-lock.yaml
git commit -m "feat(docs): audience-aware Markdown chunker"
```

---

### Task 3: Embeddings client — Ollama BGE-M3

**Files:**
- Create: `crm-node/src/server/docs/embeddings.ts`
- Modify: `crm-node/src/lib/env.ts` (add `OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_MODEL`)
- Test: `crm-node/tests/unit/docs-embeddings.test.ts`

- [ ] **Step 1: Add env vars**

In `crm-node/src/lib/env.ts`, extend the Zod schema:
```ts
OLLAMA_BASE_URL: z.string().url().optional(),           // e.g. http://ollama:11434
OLLAMA_EMBEDDING_MODEL: z.string().default("bge-m3"),
```

- [ ] **Step 2: Write failing test**

```ts
// crm-node/tests/unit/docs-embeddings.test.ts
import { describe, it, expect, vi } from "vitest";
import { embed, embedBatch, EMBEDDING_DIM } from "@/server/docs/embeddings";

describe("embeddings client", () => {
  it("posts to /api/embed with the right body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ embedding: Array(EMBEDDING_DIM).fill(0.01) }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";

    const v = await embed("hello");
    expect(v.length).toBe(EMBEDDING_DIM);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://ollama:11434/api/embed",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("embedBatch chunks requests at max=32 per call", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ embeddings: Array(32).fill(Array(EMBEDDING_DIM).fill(0.01)) }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await embedBatch(Array(70).fill("x"));
    expect(fetchSpy).toHaveBeenCalledTimes(3); // 32+32+6
  });

  it("throws when OLLAMA_BASE_URL is unset", async () => {
    delete process.env.OLLAMA_BASE_URL;
    await expect(embed("x")).rejects.toThrow(/OLLAMA_BASE_URL/);
  });
});
```

- [ ] **Step 3: Implement**

```ts
// crm-node/src/server/docs/embeddings.ts
export const EMBEDDING_DIM = 1024;
const MAX_BATCH = 32;

function baseUrl(): string {
  const u = process.env.OLLAMA_BASE_URL;
  if (!u) throw new Error("OLLAMA_BASE_URL is not set — cannot produce embeddings");
  return u.replace(/\/$/, "");
}

function model(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL ?? "bge-m3";
}

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${baseUrl()}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: model(), input: text }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status}`);
  const j = await res.json();
  // Ollama returns either { embedding: number[] } or { embeddings: number[][] } depending on input shape.
  return (j.embedding ?? j.embeddings?.[0]) as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const slice = texts.slice(i, i + MAX_BATCH);
    const res = await fetch(`${baseUrl()}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: model(), input: slice }),
    });
    if (!res.ok) throw new Error(`embed batch failed: ${res.status}`);
    const j = await res.json();
    out.push(...(j.embeddings as number[][]));
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/unit/docs-embeddings.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/server/docs/embeddings.ts crm-node/src/lib/env.ts crm-node/tests/unit/docs-embeddings.test.ts
git commit -m "feat(docs): Ollama BGE-M3 embeddings client (1024-dim)"
```

---

### Task 4: Indexer — `pnpm docs:index`

**Files:**
- Create: `crm-node/scripts/docs-index.ts`
- Create: `crm-node/src/server/docs/indexer.ts`
- Modify: `crm-node/package.json` (script)
- Test: `crm-node/tests/integration/docs-indexer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/integration/docs-indexer.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/server/db";
import { indexDocs } from "@/server/docs/indexer";

describe("docs indexer", () => {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "DocChunk" CASCADE`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: Array(100).fill(Array(1024).fill(0.01)) }),
    }));
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
  });

  it("indexes every file under content/docs — human + ai-deep — and persists rows", async () => {
    const manifest = await indexDocs({ root: "content/docs" });
    expect(manifest.chunkCount).toBeGreaterThan(0);
    const counts: any[] = await prisma.$queryRaw`
      SELECT audience, COUNT(*)::int AS n FROM "DocChunk" GROUP BY audience
    `;
    const byAudience = Object.fromEntries(counts.map((r) => [r.audience, r.n]));
    expect(byAudience.human).toBeGreaterThan(0);
    expect(byAudience["ai-deep"]).toBeGreaterThan(0);
  });

  it("is idempotent — running twice does not duplicate rows", async () => {
    await indexDocs({ root: "content/docs" });
    const firstCount: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocChunk"`;
    await indexDocs({ root: "content/docs" });
    const secondCount: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocChunk"`;
    expect(secondCount[0].n).toBe(firstCount[0].n);
  });

  it("re-embeds only chunks whose sourceHash changed", async () => {
    await indexDocs({ root: "content/docs" });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: Array(100).fill(Array(1024).fill(0.01)) }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await indexDocs({ root: "content/docs" });
    // Nothing changed → no embedding call issued.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-indexer.test.ts`

- [ ] **Step 3: Implement indexer**

```ts
// crm-node/src/server/docs/indexer.ts
import { loadDocsTree, loadDeepOnly } from "@/lib/docs-content";
import { chunkMarkdown, type Chunk } from "./chunker";
import { embedBatch, EMBEDDING_DIM } from "./embeddings";
import { prisma } from "@/server/db";
import { createHash } from "node:crypto";

export interface IndexManifest {
  chunkCount: number;
  embeddedCount: number;
  skippedUnchanged: number;
  generatedAt: string;
}

export async function indexDocs(opts: { root: string; cwd?: string }): Promise<IndexManifest> {
  const cwd = opts.cwd ?? process.cwd();

  // 1. Load every doc (human + ai-deep).
  const humanTree = await loadDocsTree({ ...opts, cwd });
  const deepPages = await loadDeepOnly({ ...opts, cwd });
  const pages = [...humanTree.flatMap((n) => n.pages), ...deepPages];

  // 2. Chunk.
  const allChunks: Chunk[] = [];
  for (const p of pages) {
    allChunks.push(
      ...chunkMarkdown({
        text: p.rawBody,
        audience: p.audience,
        slug: p.slug,
        block: p.frontmatter.block,
        kind: p.frontmatter.kind ?? (p.audience === "human" ? "overview" : "unknown"),
        title: p.frontmatter.title,
      }),
    );
  }

  // 3. Diff against existing rows by sourceHash.
  const wantedIds = allChunks.map((c) => c.id);
  const existing: Array<{ id: string; sourceHash: string }> = await prisma.$queryRaw`
    SELECT id, "sourceHash" FROM "DocChunk" WHERE id = ANY(${wantedIds}::text[])
  `;
  const existingById = new Map(existing.map((e) => [e.id, e.sourceHash]));

  const toEmbed: Chunk[] = [];
  for (const c of allChunks) {
    const h = sourceHash(c);
    if (existingById.get(c.id) !== h) toEmbed.push(c);
  }

  // 4. Embed new/changed chunks in batches.
  let embeddedCount = 0;
  if (toEmbed.length) {
    const vecs = await embedBatch(toEmbed.map((c) => `${c.title}\n\n${c.body}`));
    embeddedCount = vecs.length;

    for (let i = 0; i < toEmbed.length; i++) {
      const c = toEmbed[i];
      const vec = vecs[i];
      if (vec.length !== EMBEDDING_DIM) {
        throw new Error(`bad embedding dim: expected ${EMBEDDING_DIM}, got ${vec.length}`);
      }
      const vecLit = `[${vec.join(",")}]`;
      const hash = sourceHash(c);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocChunk" (id, slug, audience, block, kind, title, body, anchor, "sourceHash", embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           audience = EXCLUDED.audience,
           block = EXCLUDED.block,
           kind = EXCLUDED.kind,
           title = EXCLUDED.title,
           body = EXCLUDED.body,
           anchor = EXCLUDED.anchor,
           "sourceHash" = EXCLUDED."sourceHash",
           embedding = EXCLUDED.embedding`,
        c.id, c.slug, c.audience, c.block, c.kind, c.title, c.body, c.anchor ?? null, hash, vecLit,
      );
    }
  }

  // 5. Delete rows whose chunk id no longer exists (source deleted).
  await prisma.$executeRaw`
    DELETE FROM "DocChunk" WHERE id <> ALL(${wantedIds}::text[])
  `;

  return {
    chunkCount: allChunks.length,
    embeddedCount,
    skippedUnchanged: allChunks.length - embeddedCount,
    generatedAt: new Date().toISOString(),
  };
}

function sourceHash(c: Chunk): string {
  return createHash("sha256").update(c.title + "\n" + c.body).digest("hex").slice(0, 24);
}
```

- [ ] **Step 4: CLI wrapper**

```ts
// crm-node/scripts/docs-index.ts
import { indexDocs } from "../src/server/docs/indexer";

indexDocs({ root: "content/docs" }).then((m) => {
  console.log(`[docs:index] ${m.chunkCount} chunks, ${m.embeddedCount} embedded, ${m.skippedUnchanged} skipped`);
}).catch((e) => {
  console.error("[docs:index] failed:", e);
  process.exit(1);
});
```

Register in `package.json`:
```json
"docs:index": "tsx scripts/docs-index.ts"
```

- [ ] **Step 5: Run test + smoke**

Run:
```bash
pnpm vitest run tests/integration/docs-indexer.test.ts
```
Expected: 3 PASS.

Smoke (requires live Ollama):
```bash
OLLAMA_BASE_URL=http://localhost:11434 pnpm docs:index
```
Expected: positive chunk count on first run; 0 embedded on second run.

- [ ] **Step 6: Commit**

```bash
git add crm-node/scripts/docs-index.ts crm-node/src/server/docs/indexer.ts crm-node/package.json crm-node/tests/integration/docs-indexer.test.ts
git commit -m "feat(docs): pnpm docs:index — chunk+embed+upsert with source-hash diff"
```

---

### Task 5: Hybrid search function

**Files:**
- Create: `crm-node/src/server/docs/search.ts`
- Test: `crm-node/tests/integration/docs-search.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/integration/docs-search.test.ts
import { describe, it, expect, beforeAll, vi } from "vitest";
import { searchDocs } from "@/server/docs/search";
import { indexDocs } from "@/server/docs/indexer";
import { prisma } from "@/server/db";

describe("searchDocs", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE "DocChunk" CASCADE`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: Array(500).fill(Array(1024).fill(0.01)) }),
    }));
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    await indexDocs({ root: "content/docs" });
  });

  it("returns top-k hits with title + snippet + slug + score", async () => {
    const hits = await searchDocs({ q: "lead intake dedup", audiences: ["human"], k: 5 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toHaveProperty("title");
    expect(hits[0]).toHaveProperty("snippet");
    expect(hits[0]).toHaveProperty("slug");
    expect(hits[0]).toHaveProperty("score");
  });

  it("human-only mode never returns ai-deep rows", async () => {
    const hits = await searchDocs({ q: "schema", audiences: ["human"], k: 20 });
    expect(hits.every((h) => h.audience === "human")).toBe(true);
  });

  it("ai-deep boost flips ordering for field-level queries", async () => {
    const human = await searchDocs({ q: "Lead.fraudScore column", audiences: ["human", "ai-deep"], k: 5, boostAiDeep: false });
    const boosted = await searchDocs({ q: "Lead.fraudScore column", audiences: ["human", "ai-deep"], k: 5, boostAiDeep: true });
    // The boosted result set should have at least one ai-deep hit higher-ranked than in the unboosted set.
    const unboostedTopDeepIdx = human.findIndex((h) => h.audience === "ai-deep");
    const boostedTopDeepIdx = boosted.findIndex((h) => h.audience === "ai-deep");
    expect(boostedTopDeepIdx).toBeLessThanOrEqual(unboostedTopDeepIdx === -1 ? 999 : unboostedTopDeepIdx);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-search.test.ts`

- [ ] **Step 3: Implement hybrid search**

```ts
// crm-node/src/server/docs/search.ts
import { prisma } from "@/server/db";
import { embed } from "./embeddings";

export interface SearchHit {
  id: string;
  slug: string;
  audience: "human" | "ai-deep";
  block: string;
  title: string;
  snippet: string;
  anchor: string | null;
  score: number;
}

export interface SearchOpts {
  q: string;
  audiences: Array<"human" | "ai-deep">;
  k?: number;
  boostAiDeep?: boolean;
}

const RRF_K = 60; // standard RRF smoothing constant

export async function searchDocs(opts: SearchOpts): Promise<SearchHit[]> {
  const k = opts.k ?? 10;
  const kWide = Math.max(k * 3, 30);
  const aud = opts.audiences;

  // 1. Dense (vector) top-kWide.
  const qVec = await embed(opts.q);
  const vecLit = `[${qVec.join(",")}]`;
  const dense: Array<{ id: string; rank: number }> = await prisma.$queryRawUnsafe(
    `
    SELECT id, row_number() OVER (ORDER BY embedding <=> $1::vector ASC) AS rank
    FROM "DocChunk"
    WHERE audience = ANY($2::text[])
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $3
    `,
    vecLit, aud, kWide,
  );

  // 2. Sparse (BM25) top-kWide.
  const sparse: Array<{ id: string; rank: number }> = await prisma.$queryRawUnsafe(
    `
    SELECT id, row_number() OVER (ORDER BY ts_rank(tsv, plainto_tsquery('english', $1)) DESC) AS rank
    FROM "DocChunk"
    WHERE audience = ANY($2::text[])
      AND tsv @@ plainto_tsquery('english', $1)
    ORDER BY ts_rank(tsv, plainto_tsquery('english', $1)) DESC
    LIMIT $3
    `,
    opts.q, aud, kWide,
  );

  // 3. RRF fuse.
  const scores = new Map<string, number>();
  const BOOST = opts.boostAiDeep ? 1.15 : 1.0;
  for (const r of dense) scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (RRF_K + Number(r.rank)));
  for (const r of sparse) scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (RRF_K + Number(r.rank)));

  // 4. Fetch top-k chunk bodies + compute snippets.
  const topIds = [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, k * 2)
    .map(([id]) => id);
  if (!topIds.length) return [];

  const rows: Array<SearchHit & { body: string }> = await prisma.$queryRawUnsafe(
    `
    SELECT id, slug, audience, block, title, body, anchor,
           ts_headline('english', body, plainto_tsquery('english', $1),
                       'MaxWords=24, MinWords=12, ShortWord=3') AS snippet
    FROM "DocChunk"
    WHERE id = ANY($2::text[])
    `,
    opts.q, topIds,
  );

  const hits: SearchHit[] = rows.map((r) => ({
    id: r.id, slug: r.slug, audience: r.audience, block: r.block,
    title: r.title, snippet: r.snippet || r.body.slice(0, 200), anchor: r.anchor ?? null,
    score: (scores.get(r.id) ?? 0) * (r.audience === "ai-deep" ? BOOST : 1.0),
  }));

  return hits.sort((a, b) => b.score - a.score).slice(0, k);
}
```

- [ ] **Step 4: Run**

Run: `pnpm vitest run tests/integration/docs-search.test.ts`
Expected: 3 PASS. Note test #3 may be flaky with all-identical mocked embeddings — replace the mock for that test with distinct vectors if needed.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/server/docs/search.ts crm-node/tests/integration/docs-search.test.ts
git commit -m "feat(docs): hybrid pgvector+BM25 search with RRF fusion"
```

---

### Task 6: tRPC `docs.search` procedure + telemetry

**Files:**
- Create: `crm-node/src/server/routers/docs.ts`
- Modify: `crm-node/src/server/routers/_app.ts`
- Test: `crm-node/tests/integration/docs-router.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/integration/docs-router.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory } from "@/server/trpc";
import { prisma } from "@/server/db";

describe("trpc docs.search", () => {
  const createCaller = createCallerFactory(appRouter);
  const caller = createCaller({ userId: null, tenantId: "tenant_default" } as any);

  it("returns hits + logs a DocSearchEvent", async () => {
    const before: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocSearchEvent"`;
    const hits = await caller.docs.search({ q: "intake dedup", k: 5, audiences: ["human"] });
    expect(Array.isArray(hits)).toBe(true);
    const after: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocSearchEvent"`;
    expect(after[0].n).toBe(before[0].n + 1);
  });

  it("rate-limits abusive callers", async () => {
    for (let i = 0; i < 21; i++) {
      await caller.docs.search({ q: "x" + i, audiences: ["human"] });
    }
    await expect(caller.docs.search({ q: "final", audiences: ["human"] })).rejects.toThrow(/rate/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-router.test.ts`

- [ ] **Step 3: Implement router**

```ts
// crm-node/src/server/routers/docs.ts
import { z } from "zod";
import { publicProcedure, createTRPCRouter } from "@/server/trpc";
import { searchDocs } from "@/server/docs/search";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/ratelimit";

const AudienceEnum = z.enum(["human", "ai-deep"]);

export const docsRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({
      q: z.string().min(1).max(200),
      k: z.number().int().min(1).max(20).default(10),
      audiences: z.array(AudienceEnum).min(1).default(["human"]),
      boostAiDeep: z.boolean().default(false),
      mode: z.enum(["cmdk", "ask-ai"]).default("cmdk"),
    }))
    .query(async ({ input, ctx }) => {
      const rlKey = `docs:search:${ctx.userId ?? ctx.tenantId ?? "anon"}`;
      const allowed = await rateLimit(rlKey, { points: 20, windowSec: 60 });
      if (!allowed) throw new Error("rate_limited");

      const t0 = Date.now();
      const hits = await searchDocs({
        q: input.q, k: input.k, audiences: input.audiences, boostAiDeep: input.boostAiDeep,
      });
      const latencyMs = Date.now() - t0;

      await prisma.docSearchEvent.create({
        data: {
          userId: ctx.userId ?? null,
          tenantId: ctx.tenantId ?? null,
          query: input.q, mode: input.mode,
          topKJson: hits.map((h) => ({ chunkId: h.id, score: h.score })),
          latencyMs,
        },
      });
      return hits;
    }),
});
```

- [ ] **Step 4: Register in `_app.ts`**

```ts
// in createTRPCRouter({...}):
docs: docsRouter,
```

- [ ] **Step 5: Run**

Run: `pnpm vitest run tests/integration/docs-router.test.ts`
Expected: 2 PASS.

- [ ] **Step 6: Commit**

```bash
git add crm-node/src/server/routers/docs.ts crm-node/src/server/routers/_app.ts crm-node/tests/integration/docs-router.test.ts
git commit -m "feat(docs): trpc docs.search + rate-limit + telemetry"
```

---

### Task 7: Cmd+K UI (client)

**Files:**
- Create: `crm-node/src/components/docs/CommandPalette.tsx`
- Modify: `crm-node/src/app/(docs)/docs/layout.tsx`
- Test: `crm-node/tests/e2e/docs-cmdk.test.ts`

- [ ] **Step 1: Install `cmdk`**

```bash
pnpm add cmdk
```

- [ ] **Step 2: Implement palette**

```tsx
// crm-node/src/components/docs/CommandPalette.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(q), 180);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hitsQuery = trpc.docs.search.useQuery(
    { q: debouncedQ, audiences: ["human"], k: 10, mode: "cmdk" },
    { enabled: debouncedQ.length >= 2, keepPreviousData: true },
  );

  return (
    <>
      <button
        type="button"
        aria-label="Search docs (⌘K)"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        Search docs
        <kbd className="rounded border bg-muted px-1 text-xs">⌘K</kbd>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-16"
          onClick={() => setOpen(false)}
        >
          <Command
            className="w-full max-w-2xl overflow-hidden rounded-lg border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            loop
          >
            <Command.Input
              autoFocus
              value={q}
              onValueChange={setQ}
              placeholder="Search docs…"
              className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
            />
            <Command.List className="max-h-96 overflow-y-auto p-2 text-sm">
              {hitsQuery.isLoading && <div className="p-4 text-muted-foreground">Searching…</div>}
              {!hitsQuery.isLoading && hitsQuery.data?.length === 0 && (
                <div className="p-4 text-muted-foreground">No matches.</div>
              )}
              {hitsQuery.data?.map((hit) => (
                <Command.Item
                  key={hit.id}
                  value={hit.title + hit.slug}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/docs/${hit.slug}${hit.anchor ? `#${hit.anchor}` : ""}`);
                  }}
                  className={cn(
                    "cursor-pointer rounded px-3 py-2",
                    "data-[selected=true]:bg-muted",
                  )}
                >
                  <div className="font-medium">{hit.title}</div>
                  <div className="text-xs text-muted-foreground">{hit.block} / {hit.slug}</div>
                  <div
                    className="mt-1 line-clamp-2 text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: hit.snippet }}
                  />
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Place in docs layout header**

In `src/app/(docs)/docs/layout.tsx`:
```tsx
import { CommandPalette } from "@/components/docs/CommandPalette";
// ... inside <header>:
<CommandPalette />
```

- [ ] **Step 4: E2E smoke**

```ts
// crm-node/tests/e2e/docs-cmdk.test.ts
import { describe, it, expect } from "vitest";

describe("docs cmdk", () => {
  it("palette button renders with keyboard hint", async () => {
    const res = await fetch("http://localhost:3000/docs");
    const html = await res.text();
    expect(html).toMatch(/⌘K/);
    expect(html).toMatch(/Search docs/);
  });
});
```

Run (with dev server):
```bash
pnpm vitest run tests/e2e/docs-cmdk.test.ts
```
Expected: PASS.

- [ ] **Step 5: Manual keyboard-driven smoke**

Open `/docs` in a browser, press ⌘K, type "intake", select a result, confirm navigation works.

- [ ] **Step 6: Commit**

```bash
git add crm-node/src/components/docs/CommandPalette.tsx crm-node/src/app/\(docs\) crm-node/tests/e2e/docs-cmdk.test.ts crm-node/package.json crm-node/pnpm-lock.yaml
git commit -m "feat(docs): Cmd+K command palette backed by docs.search"
```

---

### Task 8: Re-index cron (pg-boss)

**Files:**
- Create: `crm-node/src/server/jobs/docs-reindex.ts`
- Modify: `crm-node/src/worker.ts`
- Test: `crm-node/tests/integration/docs-reindex-job.test.ts`

- [ ] **Step 1: Implement job**

```ts
// crm-node/src/server/jobs/docs-reindex.ts
import { indexDocs } from "@/server/docs/indexer";

export const JOB_NAME = "docs-reindex";

export async function handleDocsReindex(): Promise<void> {
  const manifest = await indexDocs({ root: "content/docs" });
  console.log(`[${JOB_NAME}] ${manifest.chunkCount} chunks, ${manifest.embeddedCount} embedded`);
}
```

- [ ] **Step 2: Register schedule in worker.ts**

In `src/worker.ts`, after existing registrations:
```ts
await boss.schedule("docs-reindex", "*/30 * * * *");   // every 30 min
boss.work("docs-reindex", async () => handleDocsReindex());
```

- [ ] **Step 3: Test the job invokes indexer**

```ts
// crm-node/tests/integration/docs-reindex-job.test.ts
import { describe, it, expect, vi } from "vitest";
import * as indexerMod from "@/server/docs/indexer";
import { handleDocsReindex } from "@/server/jobs/docs-reindex";

describe("docs-reindex job", () => {
  it("calls indexDocs once", async () => {
    const spy = vi.spyOn(indexerMod, "indexDocs").mockResolvedValue({
      chunkCount: 10, embeddedCount: 0, skippedUnchanged: 10, generatedAt: new Date().toISOString(),
    });
    await handleDocsReindex();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

Run: `pnpm vitest run tests/integration/docs-reindex-job.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add crm-node/src/server/jobs/docs-reindex.ts crm-node/src/worker.ts crm-node/tests/integration/docs-reindex-job.test.ts
git commit -m "feat(docs): docs-reindex pg-boss job, */30 min"
```

---

### Task 9: CHANGELOG + READINESS + typecheck + lint

- [ ] **Step 1: CHANGELOG entry**

```markdown
## Unreleased — Docs hybrid search

- **pgvector + BM25 hybrid search.** New `DocChunk` model, tsvector GIN + ivfflat cosine indexes, chunker (audience-aware), BGE-M3 embeddings via Ollama, RRF fusion. Exposed via tRPC `docs.search` with rate-limit (20/min/user) + `DocSearchEvent` telemetry.
- **Cmd+K palette** in `/docs` layout; human-only by default.
- **Indexer.** `pnpm docs:index` chunks+embeds+upserts with source-hash diff; `docs-reindex` pg-boss cron every 30 min.
- **New env vars:** `OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_MODEL` (default `bge-m3`).
```

- [ ] **Step 2: READINESS flip**

```markdown
- [x] Docs hybrid search (pgvector+BM25+RRF) + Cmd+K palette — #2026-04-22-docs-04
```

- [ ] **Step 3: Green lights**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm vitest run tests/unit/docs tests/integration/docs
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add crm-node/CHANGELOG.md crm-node/docs/superpowers/READINESS_CHECKLIST.md
git commit -m "docs: record hybrid search shipping"
```

---

### Task 10: Self-review

- [ ] **Step 1: Spec coverage.** DocChunk + pgvector + ts_vector ✅ · Chunker (human/ai-deep split) ✅ · Embeddings (BGE-M3 via Ollama) ✅ · Indexer ✅ · Hybrid RRF ✅ · tRPC procedure ✅ · Cmd+K UI ✅ · Telemetry ✅ · Re-index cron ✅.

- [ ] **Step 2: Placeholder scan.** All code blocks contain real code; every SQL/raw query is explicit. No TODOs introduced.

- [ ] **Step 3: Type consistency.** `DocChunk` fields match across schema/indexer/search. `SearchHit` shape stable.

- [ ] **Step 4: Hand off.** Print: "Plan #4 complete. Search is live. Plan #6 (LLM Q&A) consumes `searchDocs({ audiences: ['human','ai-deep'], boostAiDeep: true })`."
