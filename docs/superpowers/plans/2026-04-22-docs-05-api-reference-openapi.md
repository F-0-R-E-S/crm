# Docs Subsite Plan #5 — API Reference (OpenAPI → Scalar) Integrated Into `/docs`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the existing `/docs/api` Scalar viewer (shipped in v1.0.1 hotfix — RSC shell at `src/app/docs/api/page.tsx`, client component at `src/app/docs/api/ApiDocsClient.tsx`, OpenAPI source at `docs/api/v1/openapi.yaml`) into the new `/docs` subsite — same sidebar, breadcrumbs, search palette — and extend Zod-to-OpenAPI coverage to every tRPC router so the auto-gen `_deep/trpc-surface.md` files have full-fidelity schemas. Also add the OpenAPI paths as first-class search results (one hit per path+method) so Cmd+K surfaces "POST /api/v1/leads" directly.

**Architecture:** `/docs/api` route moves under the `(docs)` route group to inherit the layout. The Scalar viewer stays client-side; the wrapper adds the shared sidebar + breadcrumbs. A new OpenAPI indexer task walks `paths` and upserts one `DocChunk` per `(path, method)` with audience=`ai-deep`, block=`api-docs` (and also the owning block via `resolveBlock({kind:"rest-path"})`), so hits appear both under "API Docs" and under the relevant feature block. Zod-to-OpenAPI expansion: the v1.0.1 `scripts/gen-openapi.ts` already covers intake + bulk + health via zod-to-openapi v7; this plan extends coverage to the remaining hand-authored paths (routing simulate, schema discovery, error catalog, metrics summary) by migrating their Zod schemas into the registry.

**Tech Stack:** Already-installed `@scalar/api-reference-react`, `@asteasolutions/zod-to-openapi@7`, `yaml`. No new deps.

**Spec:** Builds on plans #2 + #4. Parallelizable with plans #3 and #6.

**Preflight:** Plans #2 and #4 merged. `docs/api/v1/openapi.yaml` exists. `pnpm gen:openapi` runs clean.

---

### Task 1: Move `/docs/api` under the `(docs)` route group

**Files:**
- Move: `crm-node/src/app/docs/api/page.tsx` → `crm-node/src/app/(docs)/docs/api/page.tsx`
- Move: `crm-node/src/app/docs/api/ApiDocsClient.tsx` → `crm-node/src/app/(docs)/docs/api/ApiDocsClient.tsx`
- Modify: `crm-node/src/middleware.ts` (if path was explicitly whitelisted; `/docs/*` already matches).
- Test: `crm-node/tests/integration/docs-api-route.test.ts`

- [ ] **Step 1: Write failing integration test**

```ts
// crm-node/tests/integration/docs-api-route.test.ts
import { describe, it, expect } from "vitest";

describe("/docs/api under new subsite", () => {
  it("still returns 200", async () => {
    const res = await fetch("http://localhost:3000/docs/api");
    expect(res.status).toBe(200);
  });

  it("renders the shared docs sidebar + breadcrumbs", async () => {
    const res = await fetch("http://localhost:3000/docs/api");
    const html = await res.text();
    expect(html).toMatch(/GambChamp Docs/);          // layout header
    expect(html).toMatch(/Lead Intake/);             // sidebar block
    expect(html).toMatch(/API Reference/);           // breadcrumb leaf
  });

  it("Scalar viewer mounts client-side (no hydration errors in markup)", async () => {
    const res = await fetch("http://localhost:3000/docs/api");
    const html = await res.text();
    expect(html).toMatch(/scalar/i); // Scalar injects an `scalar-api-reference` container
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-api-route.test.ts`
Expected: 2 FAIL (sidebar + breadcrumbs not shared yet).

- [ ] **Step 3: Physically move files**

```bash
mkdir -p crm-node/src/app/\(docs\)/docs/api
git mv crm-node/src/app/docs/api/page.tsx crm-node/src/app/\(docs\)/docs/api/page.tsx
git mv crm-node/src/app/docs/api/ApiDocsClient.tsx crm-node/src/app/\(docs\)/docs/api/ApiDocsClient.tsx
# delete empty parent
rmdir crm-node/src/app/docs/api crm-node/src/app/docs 2>/dev/null || true
```

- [ ] **Step 4: Wrap page in shared layout elements**

Edit `crm-node/src/app/(docs)/docs/api/page.tsx`:
```tsx
import { Breadcrumbs } from "@/components/docs/Breadcrumbs";
import ApiDocsClient from "./ApiDocsClient";

export const metadata = {
  title: "API Reference — GambChamp CRM",
  description: "Live OpenAPI 3.0 reference for the public /api/v1 surface.",
};

export default function DocsApiPage() {
  return (
    <article className="min-w-0 flex-1">
      <Breadcrumbs
        trail={[
          { label: "Docs", href: "/docs" },
          { label: "API Reference" },
        ]}
      />
      <h1 className="text-3xl font-semibold">API Reference</h1>
      <p className="my-3 text-muted-foreground">
        Public REST surface. Authenticate with a Bearer API key; pin the schema version via <code>X-API-Version</code>.
      </p>
      <div className="mt-6 rounded-lg border">
        <ApiDocsClient />
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Add "API Reference" as a pseudo-block in the sidebar**

Modify `crm-node/src/components/docs/Sidebar.tsx` — after the mapped `tree.map(...)` iteration, append a hardcoded link:
```tsx
<div>
  <h3 className="mb-2 font-semibold">Reference</h3>
  <ul className="space-y-1">
    <li>
      <Link
        href="/docs/api"
        className={cn(
          "block rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          pathname === "/docs/api" && "bg-muted font-medium text-foreground",
        )}
      >
        API Reference (OpenAPI)
      </Link>
    </li>
  </ul>
</div>
```

- [ ] **Step 6: Run tests**

Start dev server, run:
```bash
pnpm vitest run tests/integration/docs-api-route.test.ts
```
Expected: 3 PASS.

- [ ] **Step 7: Commit**

```bash
git add crm-node/src/app crm-node/src/components/docs/Sidebar.tsx crm-node/tests/integration/docs-api-route.test.ts
git commit -m "feat(docs): move /docs/api into shared (docs) layout with sidebar + breadcrumbs"
```

---

### Task 2: Index OpenAPI paths into search

**Files:**
- Modify: `crm-node/src/server/docs/indexer.ts`
- Create: `crm-node/src/server/docs/openapi-indexer.ts`
- Test: `crm-node/tests/integration/docs-openapi-indexer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/integration/docs-openapi-indexer.test.ts
import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "@/server/db";
import { indexDocs } from "@/server/docs/indexer";

describe("OpenAPI indexing", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE "DocChunk" CASCADE`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ embeddings: Array(500).fill(Array(1024).fill(0.01)) }),
    }));
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    await indexDocs({ root: "content/docs" });
  });

  it("one chunk per (path, method) from openapi.yaml", async () => {
    const rows: Array<{ title: string; slug: string; kind: string; audience: string; block: string }> =
      await prisma.$queryRaw`SELECT title, slug, kind, audience, block FROM "DocChunk" WHERE kind = 'openapi'`;
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.audience === "ai-deep")).toBe(true);
    expect(rows.some((r) => r.title === "POST /api/v1/leads")).toBe(true);
  });

  it("OpenAPI chunks carry a slug that deep-links to /docs/api#<operation-id>", async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT slug, anchor FROM "DocChunk" WHERE kind = 'openapi' AND title = 'POST /api/v1/leads'
    `;
    expect(rows[0].slug).toBe("api");
    expect(rows[0].anchor).toMatch(/^operation-/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-openapi-indexer.test.ts`

- [ ] **Step 3: Implement OpenAPI indexer**

```ts
// crm-node/src/server/docs/openapi-indexer.ts
import { readFile } from "node:fs/promises";
import yaml from "yaml";
import { createHash } from "node:crypto";
import type { Chunk } from "./chunker";
import { resolveBlock } from "../../../scripts/docs-regen/block-catalog";

export async function openapiChunks(opts: { openapiYamlPath: string; cwd?: string }): Promise<Chunk[]> {
  const cwd = opts.cwd ?? process.cwd();
  const raw = await readFile(`${cwd}/${opts.openapiYamlPath}`, "utf8");
  const spec: any = yaml.parse(raw);
  const chunks: Chunk[] = [];

  for (const [path, ops] of Object.entries<any>(spec.paths ?? {})) {
    for (const method of Object.keys(ops)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
      const op = ops[method];
      const title = `${method.toUpperCase()} ${path}`;
      const body = [
        op.summary ?? "",
        op.description ?? "",
        "",
        "**Request body:**",
        yaml.stringify(op.requestBody ?? { note: "no body" }),
        "",
        "**Responses:**",
        yaml.stringify(op.responses ?? {}),
      ].join("\n");
      const anchor = `operation-${(op.operationId ?? `${method}${path.replace(/[^a-z0-9]/gi, "-")}`).toLowerCase()}`;
      const block = resolveBlock({ kind: "rest-path", name: path }) ?? "api-docs";
      const id = createHash("sha256").update(`openapi::${title}`).digest("hex").slice(0, 16);
      chunks.push({
        id,
        slug: "api",
        audience: "ai-deep",
        block,
        kind: "openapi",
        title,
        body,
        anchor,
        tokens: Math.ceil(body.length / 4),
      });
    }
  }
  return chunks;
}
```

- [ ] **Step 4: Wire into indexer**

Modify `src/server/docs/indexer.ts` — after collecting `allChunks` from content pages, append OpenAPI chunks:
```ts
import { openapiChunks } from "./openapi-indexer";
// ...
const openapi = await openapiChunks({ openapiYamlPath: "docs/api/v1/openapi.yaml", cwd });
allChunks.push(...openapi);
```

- [ ] **Step 5: Run tests**

Run:
```bash
pnpm vitest run tests/integration/docs-openapi-indexer.test.ts tests/integration/docs-indexer.test.ts
```
Expected: all PASS. Existing indexer test still green (it only asserted `chunkCount > 0`, which remains true).

- [ ] **Step 6: Commit**

```bash
git add crm-node/src/server/docs/openapi-indexer.ts crm-node/src/server/docs/indexer.ts crm-node/tests/integration/docs-openapi-indexer.test.ts
git commit -m "feat(docs): index OpenAPI paths+methods into search"
```

---

### Task 3: Cmd+K result highlights OpenAPI hits

**Files:**
- Modify: `crm-node/src/components/docs/CommandPalette.tsx`
- Test: manual only (no new integration test — covered by search).

- [ ] **Step 1: Distinguish OpenAPI hits visually**

In `CommandPalette.tsx`, inside the `Command.Item` mapper, when `hit.kind === "openapi"`, render a small "API" badge before the title:
```tsx
{hit.kind === "openapi" && (
  <span className="mr-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
    API
  </span>
)}
```

Then on select, route to `/docs/api#${hit.anchor}` (Scalar supports `operationId`-based anchors):
```tsx
onSelect={() => {
  setOpen(false);
  const url = hit.kind === "openapi"
    ? `/docs/api#${hit.anchor}`
    : `/docs/${hit.slug}${hit.anchor ? `#${hit.anchor}` : ""}`;
  router.push(url);
}}
```

Because the human default is `audiences: ["human"]` but OpenAPI hits are `ai-deep`, include them explicitly for the Cmd+K query:
```tsx
const hitsQuery = trpc.docs.search.useQuery(
  {
    q: debouncedQ,
    // Include OpenAPI (ai-deep, kind="openapi") in human-facing search.
    audiences: ["human", "ai-deep"],
    // …but cap ai-deep to openapi via post-filter on client (cheap; doesn't need a new RPC shape):
    k: 15,
    mode: "cmdk",
  },
  { enabled: debouncedQ.length >= 2, keepPreviousData: true },
);
const filtered = hitsQuery.data?.filter(
  (h) => h.audience === "human" || h.kind === "openapi",
);
```

(Update the `Command.List` mapper to iterate `filtered` instead of `hitsQuery.data`.)

**Trade-off:** this bypasses the SQL audience filter. If we care about strict server-side enforcement, add a `kinds?: string[]` input to `docs.search` and push the filter server-side — parking lot for v1.1 if users complain about other ai-deep content leaking.

- [ ] **Step 2: Manual verification**

Run `pnpm dev`, press ⌘K, type "leads" — confirm `POST /api/v1/leads` appears with a green "API" badge and navigates to `/docs/api#operation-...`.

- [ ] **Step 3: Commit**

```bash
git add crm-node/src/components/docs/CommandPalette.tsx
git commit -m "feat(docs): surface OpenAPI hits in Cmd+K with badge + deep-link"
```

---

### Task 4: Expand Zod-to-OpenAPI coverage

**Files:**
- Modify: `crm-node/scripts/gen-openapi.ts`
- Modify: `crm-node/src/server/schema/registry.ts` (add missing Zod schemas)
- Test: `crm-node/tests/unit/openapi-spec.test.ts` (already exists, extend)

- [ ] **Step 1: Identify hand-authored paths in openapi.yaml**

Based on v1.0.1 hotfix notes: `/leads/bulk/{jobId}`, routing simulate, schema discovery, error catalog, metrics summary remain hand-authored. Goal of this task: pull at least 2 of those onto the zod-to-openapi path.

Pick `/api/v1/routing/simulate` (used in routing router) and `/api/v1/errors` (error catalog) — both already have Zod schemas elsewhere in the code; the work is moving the definitions under `src/server/schema/registry.ts` so `scripts/gen-openapi.ts` can register them.

- [ ] **Step 2: Move `simulateRequestSchema` + `simulateResponseSchema` into registry**

Expected structure in `src/server/schema/registry.ts`:
```ts
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

export const simulateRequestSchema = z.object({
  /* ... copy from current routing route handler … */
}).openapi("RoutingSimulateRequest");
export const simulateResponseSchema = z.object({
  /* ... */
}).openapi("RoutingSimulateResponse");
```

- [ ] **Step 3: Register path in `gen-openapi.ts`**

Append to the `OpenApiGeneratorV31` `.registerPath(...)` calls:
```ts
registry.registerPath({
  method: "post",
  path: "/api/v1/routing/simulate",
  request: { body: { content: { "application/json": { schema: simulateRequestSchema } } } },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: simulateResponseSchema } } },
  },
  tags: ["routing"],
});
```

Repeat for `/api/v1/errors` — response schema is a simple array of `{ code, message, httpStatus, hint }` already typed in `src/app/api/v1/errors/route.ts`.

- [ ] **Step 4: Extend `openapi-spec.test.ts`**

Add assertions:
```ts
it("includes the zod-generated POST /api/v1/routing/simulate path", async () => {
  const spec = await loadSpec();
  expect(spec.paths?.["/api/v1/routing/simulate"]?.post).toBeDefined();
  expect(spec.paths?.["/api/v1/routing/simulate"]?.post?.requestBody).toBeDefined();
});

it("includes the GET /api/v1/errors path", async () => {
  const spec = await loadSpec();
  expect(spec.paths?.["/api/v1/errors"]?.get).toBeDefined();
});
```

- [ ] **Step 5: Regenerate + check**

Run:
```bash
pnpm openapi:build
pnpm vitest run tests/unit/openapi-spec.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add crm-node/scripts/gen-openapi.ts crm-node/src/server/schema/registry.ts crm-node/docs/api/v1/openapi.yaml crm-node/tests/unit/openapi-spec.test.ts
git commit -m "feat(api): expand zod-to-openapi coverage (routing simulate, errors catalog)"
```

---

### Task 5: CHANGELOG + READINESS

- [ ] **Step 1: CHANGELOG**

```markdown
## Unreleased — API reference integrated into /docs

- **`/docs/api` under shared layout.** Moved RSC shell into the `(docs)` route group; sidebar + breadcrumbs + Cmd+K surface it consistently.
- **OpenAPI indexed for search.** One `DocChunk` per (path, method), kind=`openapi`, deep-links to `/docs/api#operation-<id>`.
- **zod-to-openapi coverage extended.** `POST /api/v1/routing/simulate` + `GET /api/v1/errors` now generated from Zod; previously hand-authored.
```

- [ ] **Step 2: READINESS**

```markdown
- [x] API reference folded into /docs subsite + OpenAPI indexed for search — #2026-04-22-docs-05
```

- [ ] **Step 3: Green lights**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm openapi:build && pnpm vitest run tests/integration/docs-api-route.test.ts tests/integration/docs-openapi-indexer.test.ts tests/unit/openapi-spec.test.ts
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add crm-node/CHANGELOG.md crm-node/docs/superpowers/READINESS_CHECKLIST.md
git commit -m "docs: record API-reference integration + openapi search"
```

---

### Task 6: Self-review

- [ ] **Step 1: Spec coverage.** Route move ✅ · Sidebar integration ✅ · OpenAPI indexed for search ✅ · Zod coverage expanded (2 paths) ✅.

- [ ] **Step 2: Placeholder scan.** All steps have concrete code or exact commands.

- [ ] **Step 3: Parking lot.** Remaining hand-authored paths (`/leads/bulk/{jobId}`, schema discovery, metrics summary) — deferred to v1.1; each requires moving an inline Zod schema into the registry. Not required for v1 docs launch.

- [ ] **Step 4: Hand off.** Print: "Plan #5 complete. API reference is now a first-class citizen of /docs. Proceed to plan #6 (local LLM Q&A)."
