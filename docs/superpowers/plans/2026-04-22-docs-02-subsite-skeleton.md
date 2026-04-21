# Docs Subsite Plan #2 — `/docs` Skeleton + MDX Pipeline + Two-Tier Filtering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the public `/docs` subsite inside `crm-node` — Next.js App Router, MDX content pipeline that reads `crm-node/content/docs/<block>/*.mdx`, two-tier visibility filtering via frontmatter (`audience: human | ai-deep`), sidebar nav generated from the block catalog, breadcrumbs, page TOC, prev/next pagination, dark mode tokens from `crm-design/`. At the end of this plan the site renders an empty-content skeleton (one placeholder MDX per block); plan #3 fills the pages.

**Architecture:** New route group `src/app/(docs)/docs/` sitting alongside `(dashboard)`. Because the docs must be publicly reachable on the `network.<slug>.<root>` domain role (already whitelisted in `src/middleware.ts:26` — the existing `/docs/*` matcher originally added for `/docs/api`), the existing middleware allows it. Content lives in `crm-node/content/docs/` (populated by plan #1). A build-time content loader (`src/lib/docs-content.ts`) walks the directory, parses frontmatter with Zod, builds the nav tree excluding `_deep/` subdirectories. The dynamic route `/docs/[...slug]/page.tsx` resolves the slug to a file, renders MDX via `next-mdx-remote/rsc`. A root `/docs/page.tsx` shows the landing with the block grid.

**Tech Stack:** `next-mdx-remote@5` (RSC mode), `rehype-slug`, `rehype-autolink-headings`, `rehype-pretty-code` (shiki-based, uses Next 15's compile), `remark-gfm`, `gray-matter`, Zod (frontmatter). Dark-mode tokens piggyback on the existing `TenantBrandingStyle` / Tailwind theme from `crm-design/`. No new UI lib — reuse existing `src/components/ui/*`.

**Spec:** Depends on plan #1 shipped (content tree + 24 block ids). Feeds plans #3 (content authoring), #4 (search), #6 (LLM chat widget).

**Preflight:**
- Plan #1 merged (`content/docs/<block>/_deep/*.md` exists, `docs/feature-inventory.md` exists).
- `pnpm dev` starts clean.
- `pnpm docs:regen` runs clean.

---

### Task 1: Install MDX pipeline dependencies

**Files:**
- Modify: `crm-node/package.json`
- Modify: `crm-node/pnpm-lock.yaml`

- [ ] **Step 1: Install runtime deps**

Run:
```bash
pnpm add next-mdx-remote@^5 gray-matter remark-gfm rehype-slug rehype-autolink-headings rehype-pretty-code shiki
```
Expected: no errors, lockfile updated.

- [ ] **Step 2: Verify versions align with Next 15 RSC**

Run:
```bash
pnpm list next-mdx-remote next | head -20
```
Confirm `next-mdx-remote >=5.0.0` (RSC-capable) and `next >=15.0.0`.

- [ ] **Step 3: Commit (lockfile only so far)**

```bash
git add crm-node/package.json crm-node/pnpm-lock.yaml
git commit -m "build: add MDX pipeline deps for docs subsite"
```

---

### Task 2: Frontmatter Zod schema

**Files:**
- Create: `crm-node/src/lib/docs-frontmatter.ts`
- Test: `crm-node/tests/unit/docs-frontmatter.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-frontmatter.test.ts
import { describe, it, expect } from "vitest";
import { parseDocsFrontmatter, DocsFrontmatterSchema } from "@/lib/docs-frontmatter";

describe("docs frontmatter", () => {
  it("accepts a valid human-audience page", () => {
    const fm = parseDocsFrontmatter({
      audience: "human",
      block: "intake",
      source: "hand",
      title: "Lead intake overview",
      description: "What the intake pipeline does and when to use it.",
      order: 1,
    });
    expect(fm.audience).toBe("human");
  });

  it("rejects unknown audience value", () => {
    expect(() => parseDocsFrontmatter({
      audience: "robots",
      block: "intake",
      source: "hand",
      title: "X",
    } as any)).toThrow();
  });

  it("rejects block id not in the catalog", () => {
    expect(() => parseDocsFrontmatter({
      audience: "human",
      block: "not-a-real-block",
      source: "hand",
      title: "X",
    } as any)).toThrow(/block/);
  });

  it("accepts ai-deep with kind discriminator", () => {
    const fm = parseDocsFrontmatter({
      audience: "ai-deep",
      block: "intake",
      source: "auto-gen",
      kind: "prisma",
      title: "DB Schema — intake",
    });
    expect(fm.kind).toBe("prisma");
  });

  it("defaults order to 9999 when missing", () => {
    const fm = parseDocsFrontmatter({
      audience: "human",
      block: "intake",
      source: "hand",
      title: "X",
    });
    expect(fm.order).toBe(9999);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-frontmatter.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement schema**

```ts
// crm-node/src/lib/docs-frontmatter.ts
import { z } from "zod";
import { BLOCK_CATALOG } from "../../scripts/docs-regen/block-catalog";

const BLOCK_IDS = BLOCK_CATALOG.map((b) => b.id) as [string, ...string[]];

export const DocsFrontmatterSchema = z.object({
  audience: z.enum(["human", "ai-deep"]),
  block: z.enum(BLOCK_IDS),
  source: z.enum(["hand", "auto-gen", "hybrid"]),
  kind: z.enum(["prisma", "trpc", "rest", "env", "errors", "telegram", "jobs", "invariants"]).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().default(9999),
  slugOverride: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type DocsFrontmatter = z.infer<typeof DocsFrontmatterSchema>;

export function parseDocsFrontmatter(raw: unknown): DocsFrontmatter {
  return DocsFrontmatterSchema.parse(raw);
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-frontmatter.test.ts`
Expected: all PASS (5).

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/lib/docs-frontmatter.ts crm-node/tests/unit/docs-frontmatter.test.ts
git commit -m "feat(docs): docs frontmatter Zod schema"
```

---

### Task 3: Content loader — walk `content/docs/` and build nav tree

**Files:**
- Create: `crm-node/src/lib/docs-content.ts`
- Test: `crm-node/tests/unit/docs-content-loader.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-content-loader.test.ts
import { describe, it, expect } from "vitest";
import { loadDocsTree, findDoc, type DocsNode } from "@/lib/docs-content";

describe("docs content loader", () => {
  it("returns one node per block with at least one human MDX", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    expect(tree.length).toBeGreaterThan(0);
    const intake = tree.find((n) => n.blockId === "intake");
    expect(intake).toBeDefined();
    expect(intake!.pages.every((p) => p.audience === "human")).toBe(true);
  });

  it("excludes files under _deep/ from the nav tree", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    const allPaths = tree.flatMap((n) => n.pages.map((p) => p.slug));
    expect(allPaths.every((s) => !s.includes("_deep"))).toBe(true);
  });

  it("findDoc resolves a known slug", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    const any = tree[0]?.pages[0];
    if (!any) return;
    const found = findDoc(tree, any.slug);
    expect(found?.frontmatter.title).toBe(any.frontmatter.title);
  });

  it("sorts pages by frontmatter.order asc then title asc", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    for (const node of tree) {
      for (let i = 1; i < node.pages.length; i++) {
        const a = node.pages[i - 1];
        const b = node.pages[i];
        expect(
          a.frontmatter.order < b.frontmatter.order ||
          (a.frontmatter.order === b.frontmatter.order && a.frontmatter.title <= b.frontmatter.title),
        ).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-content-loader.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement loader**

```ts
// crm-node/src/lib/docs-content.ts
import { readFile } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { parseDocsFrontmatter, type DocsFrontmatter } from "./docs-frontmatter";
import { BLOCK_CATALOG } from "../../scripts/docs-regen/block-catalog";

export interface DocsPage {
  slug: string;       // "intake/overview" — segments relative to /docs
  filePath: string;   // absolute fs path
  audience: "human" | "ai-deep";
  frontmatter: DocsFrontmatter;
  rawBody: string;
}

export interface DocsNode {
  blockId: string;
  blockTitle: string;
  order: number;
  pages: DocsPage[];          // audience=human only; _deep/ is loaded separately by search/LLM
}

export interface LoadOpts {
  root: string;               // "content/docs" (relative to cwd)
  cwd?: string;
  includeDeep?: boolean;      // true → include ai-deep pages (used by search+LLM indexers)
}

export async function loadDocsTree(opts: LoadOpts): Promise<DocsNode[]> {
  const cwd = opts.cwd ?? process.cwd();
  const pattern = opts.includeDeep
    ? `${opts.root}/**/*.{md,mdx}`
    : `${opts.root}/**/*.{md,mdx}`;
  const files = await fg(pattern, {
    cwd,
    absolute: true,
    ignore: opts.includeDeep ? [] : [`${opts.root}/**/_deep/**`],
  });

  const byBlock = new Map<string, DocsPage[]>();
  for (const b of BLOCK_CATALOG) byBlock.set(b.id, []);

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const { data, content } = matter(raw);
    let fm: DocsFrontmatter;
    try {
      fm = parseDocsFrontmatter(data);
    } catch (e) {
      throw new Error(`Invalid docs frontmatter in ${file}: ${(e as Error).message}`);
    }
    const relPath = relative(resolve(cwd, opts.root), file).replace(/\.(md|mdx)$/, "");
    const slug = fm.slugOverride ?? relPath;
    const page: DocsPage = {
      slug,
      filePath: file,
      audience: fm.audience,
      frontmatter: fm,
      rawBody: content,
    };
    if (!opts.includeDeep && fm.audience !== "human") continue;
    if (!byBlock.has(fm.block)) byBlock.set(fm.block, []);
    byBlock.get(fm.block)!.push(page);
  }

  const out: DocsNode[] = [];
  for (const b of BLOCK_CATALOG) {
    const pages = (byBlock.get(b.id) ?? []).sort((a, z) =>
      (a.frontmatter.order - z.frontmatter.order) ||
      a.frontmatter.title.localeCompare(z.frontmatter.title),
    );
    if (!pages.length) continue;
    out.push({ blockId: b.id, blockTitle: b.title, order: b.order, pages });
  }
  return out.sort((a, b) => a.order - b.order);
}

export function findDoc(tree: DocsNode[], slug: string): DocsPage | null {
  for (const n of tree) {
    const p = n.pages.find((pg) => pg.slug === slug);
    if (p) return p;
  }
  return null;
}

export async function loadDeepOnly(opts: { root: string; cwd?: string }): Promise<DocsPage[]> {
  const full = await loadDocsTree({ ...opts, includeDeep: true });
  return full.flatMap((n) => n.pages).filter((p) => p.audience === "ai-deep");
}
```

- [ ] **Step 4: Create a placeholder human-layer MDX so loader has something to find**

Create `crm-node/content/docs/intake/index.mdx`:
```mdx
---
audience: human
block: intake
source: hand
title: "Lead Intake — overview"
description: "Public placeholder page; replaced in docs plan #3."
order: 1
---

# Lead Intake

_Coming soon: overview of the intake pipeline._
```

Repeat for all 24 blocks — minimal frontmatter + one H1 placeholder. (This ensures the loader test passes and the subsite shows every block.)

- [ ] **Step 5: Run test**

Run: `pnpm vitest run tests/unit/docs-content-loader.test.ts`
Expected: PASS (4).

- [ ] **Step 6: Commit**

```bash
git add crm-node/src/lib/docs-content.ts crm-node/content/docs crm-node/tests/unit/docs-content-loader.test.ts
git commit -m "feat(docs): content loader with human/_deep filtering + 24 placeholder pages"
```

---

### Task 4: `/docs` route layout + landing page

**Files:**
- Create: `crm-node/src/app/(docs)/docs/layout.tsx`
- Create: `crm-node/src/app/(docs)/docs/page.tsx`
- Create: `crm-node/src/components/docs/Sidebar.tsx`
- Create: `crm-node/src/components/docs/Breadcrumbs.tsx`
- Test: `crm-node/tests/integration/docs-route.test.ts`

- [ ] **Step 1: Write failing integration test**

```ts
// crm-node/tests/integration/docs-route.test.ts
import { describe, it, expect } from "vitest";

describe("/docs route", () => {
  it("renders the landing with all block cards", async () => {
    const res = await fetch("http://localhost:3000/docs");
    expect(res.status).toBe(200);
    const html = await res.text();
    // At least 10 distinct block links on the landing grid.
    const blockLinks = [...html.matchAll(/href="\/docs\/([a-z-]+)"/g)].map((m) => m[1]);
    expect(new Set(blockLinks).size).toBeGreaterThanOrEqual(10);
  });

  it("does not render any _deep links on the landing", async () => {
    const res = await fetch("http://localhost:3000/docs");
    const html = await res.text();
    expect(html).not.toMatch(/_deep/);
  });
});
```

- [ ] **Step 2: Implement layout**

```tsx
// crm-node/src/app/(docs)/docs/layout.tsx
import { loadDocsTree } from "@/lib/docs-content";
import { Sidebar } from "@/components/docs/Sidebar";

export const dynamic = "force-static";
export const revalidate = false;

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const tree = await loadDocsTree({ root: "content/docs" });
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-8 px-4 py-8">
      <aside className="w-64 shrink-0 border-r pr-6">
        <Sidebar tree={tree} />
      </aside>
      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Implement landing**

```tsx
// crm-node/src/app/(docs)/docs/page.tsx
import Link from "next/link";
import { loadDocsTree } from "@/lib/docs-content";

export const metadata = {
  title: "GambChamp CRM — Docs",
  description: "Operator + developer documentation for the GambChamp CRM platform.",
};

export default async function DocsLanding() {
  const tree = await loadDocsTree({ root: "content/docs" });
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Documentation</h1>
        <p className="text-muted-foreground">
          Browse by feature block or use the search box (⌘K). Every block has an overview, recipes, and concepts.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tree.map((node) => (
          <Link
            key={node.blockId}
            href={`/docs/${node.pages[0].slug}`}
            className="rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <h2 className="font-medium">{node.blockTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {node.pages.length} page{node.pages.length === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement Sidebar component**

```tsx
// crm-node/src/components/docs/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocsNode } from "@/lib/docs-content";
import { cn } from "@/lib/utils";

export function Sidebar({ tree }: { tree: DocsNode[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6 text-sm">
      {tree.map((node) => (
        <div key={node.blockId}>
          <h3 className="mb-2 font-semibold">{node.blockTitle}</h3>
          <ul className="space-y-1">
            {node.pages.map((p) => {
              const href = `/docs/${p.slug}`;
              const active = pathname === href;
              return (
                <li key={p.slug}>
                  <Link
                    href={href}
                    className={cn(
                      "block rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      active && "bg-muted font-medium text-foreground",
                    )}
                  >
                    {p.frontmatter.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: Implement Breadcrumbs**

```tsx
// crm-node/src/components/docs/Breadcrumbs.tsx
import Link from "next/link";

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap gap-1">
        {trail.map((t, i) => (
          <li key={i} className="flex items-center gap-1">
            {t.href ? (
              <Link href={t.href} className="hover:text-foreground">{t.label}</Link>
            ) : (
              <span className="text-foreground">{t.label}</span>
            )}
            {i < trail.length - 1 && <span aria-hidden>›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 6: Run dev server + integration test**

Run in two terminals:
```bash
# terminal 1
pnpm dev

# terminal 2
pnpm vitest run tests/integration/docs-route.test.ts
```
Expected: both test cases PASS.

- [ ] **Step 7: Commit**

```bash
git add crm-node/src/app/\(docs\) crm-node/src/components/docs crm-node/tests/integration/docs-route.test.ts
git commit -m "feat(docs): /docs route layout + landing + sidebar + breadcrumbs"
```

---

### Task 5: Dynamic page route `/docs/[...slug]`

**Files:**
- Create: `crm-node/src/app/(docs)/docs/[...slug]/page.tsx`
- Create: `crm-node/src/components/docs/mdx.tsx` (MDX component map)
- Create: `crm-node/src/components/docs/Toc.tsx`
- Test: `crm-node/tests/integration/docs-page.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/integration/docs-page.test.ts
import { describe, it, expect } from "vitest";

describe("/docs/[...slug]", () => {
  it("renders a known human page", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/index");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/Lead Intake/);
  });

  it("returns 404 for slug that points to _deep content", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/_deep/db-schema");
    expect(res.status).toBe(404);
  });

  it("404s on nonexistent slug", async () => {
    const res = await fetch("http://localhost:3000/docs/does-not-exist/anywhere");
    expect(res.status).toBe(404);
  });

  it("renders TOC anchors for h2/h3 headings", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/index");
    const html = await res.text();
    // rehype-slug injects id on headings
    expect(html).toMatch(/<h[23]\s+id=/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-page.test.ts`
Expected: 4 FAIL.

- [ ] **Step 3: Implement MDX component map**

```tsx
// crm-node/src/components/docs/mdx.tsx
import type { MDXComponents } from "mdx/types";
import { cn } from "@/lib/utils";

export const docsMdxComponents: MDXComponents = {
  h1: (props) => <h1 {...props} className={cn("scroll-mt-20 text-3xl font-semibold", props.className)} />,
  h2: (props) => <h2 {...props} className={cn("mt-8 scroll-mt-20 border-b pb-1 text-2xl font-semibold", props.className)} />,
  h3: (props) => <h3 {...props} className={cn("mt-6 scroll-mt-20 text-xl font-semibold", props.className)} />,
  p: (props) => <p {...props} className={cn("my-4 leading-7", props.className)} />,
  ul: (props) => <ul {...props} className={cn("my-4 list-disc space-y-1 pl-6", props.className)} />,
  ol: (props) => <ol {...props} className={cn("my-4 list-decimal space-y-1 pl-6", props.className)} />,
  code: (props) => <code {...props} className={cn("rounded bg-muted px-1 py-0.5 text-sm", props.className)} />,
  pre: (props) => <pre {...props} className={cn("my-4 overflow-x-auto rounded-lg border p-4 text-sm", props.className)} />,
  a: (props) => <a {...props} className={cn("underline underline-offset-2 hover:text-foreground", props.className)} />,
  blockquote: (props) => <blockquote {...props} className={cn("my-4 border-l-4 border-muted pl-4 text-muted-foreground", props.className)} />,
  table: (props) => <table {...props} className={cn("my-4 w-full border-collapse text-sm", props.className)} />,
  th: (props) => <th {...props} className={cn("border-b p-2 text-left font-medium", props.className)} />,
  td: (props) => <td {...props} className={cn("border-b p-2", props.className)} />,
};
```

- [ ] **Step 4: Implement TOC extractor**

```tsx
// crm-node/src/components/docs/Toc.tsx
export interface TocEntry { depth: 2 | 3; text: string; slug: string }

export function extractToc(markdown: string): TocEntry[] {
  const out: TocEntry[] = [];
  const re = /^(#{2,3})\s+(.+)$/gm;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const depth = (m[1].length as 2 | 3);
    const text = m[2].trim().replace(/^`|`$/g, "");
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    out.push({ depth, text, slug });
  }
  return out;
}

export function Toc({ entries }: { entries: TocEntry[] }) {
  if (!entries.length) return null;
  return (
    <aside className="sticky top-8 hidden max-h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-l pl-6 text-sm xl:block">
      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">On this page</h4>
      <ul className="space-y-1">
        {entries.map((e) => (
          <li key={e.slug} style={{ paddingLeft: (e.depth - 2) * 12 }}>
            <a href={`#${e.slug}`} className="block text-muted-foreground hover:text-foreground">
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 5: Implement dynamic page**

```tsx
// crm-node/src/app/(docs)/docs/[...slug]/page.tsx
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { loadDocsTree, findDoc } from "@/lib/docs-content";
import { docsMdxComponents } from "@/components/docs/mdx";
import { Breadcrumbs } from "@/components/docs/Breadcrumbs";
import { Toc, extractToc } from "@/components/docs/Toc";
import { BLOCK_CATALOG } from "../../../../../scripts/docs-regen/block-catalog";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateStaticParams() {
  const tree = await loadDocsTree({ root: "content/docs" });
  return tree.flatMap((n) => n.pages.map((p) => ({ slug: p.slug.split("/") })));
}

export default async function DocsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const joined = slug.join("/");
  if (joined.includes("_deep")) notFound();

  const tree = await loadDocsTree({ root: "content/docs" });
  const page = findDoc(tree, joined);
  if (!page) notFound();

  const { content } = await compileMDX({
    source: page.rawBody,
    components: docsMdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "append" }],
          [rehypePrettyCode, { theme: "github-dark" }],
        ],
      },
    },
  });

  const block = BLOCK_CATALOG.find((b) => b.id === page.frontmatter.block)!;
  const trail = [
    { label: "Docs", href: "/docs" },
    { label: block.title, href: `/docs/${tree.find((n) => n.blockId === block.id)!.pages[0].slug}` },
    { label: page.frontmatter.title },
  ];

  const toc = extractToc(page.rawBody);

  return (
    <div className="flex gap-8">
      <article className="prose prose-neutral min-w-0 flex-1 dark:prose-invert">
        <Breadcrumbs trail={trail} />
        {content}
      </article>
      <Toc entries={toc} />
    </div>
  );
}
```

- [ ] **Step 6: Run dev + test**

Run:
```bash
pnpm dev    # keep running
pnpm vitest run tests/integration/docs-page.test.ts
```
Expected: 4 PASS.

- [ ] **Step 7: Commit**

```bash
git add crm-node/src/app/\(docs\) crm-node/src/components/docs/mdx.tsx crm-node/src/components/docs/Toc.tsx crm-node/tests/integration/docs-page.test.ts
git commit -m "feat(docs): dynamic MDX page route + TOC + breadcrumbs"
```

---

### Task 6: Prev/Next pagination

**Files:**
- Create: `crm-node/src/components/docs/PrevNext.tsx`
- Modify: `crm-node/src/app/(docs)/docs/[...slug]/page.tsx`
- Test: `crm-node/tests/unit/docs-prev-next.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-prev-next.test.ts
import { describe, it, expect } from "vitest";
import { computePrevNext } from "@/components/docs/PrevNext";
import type { DocsNode } from "@/lib/docs-content";

const tree: DocsNode[] = [
  {
    blockId: "intake", blockTitle: "Lead Intake", order: 1,
    pages: [
      { slug: "intake/index", audience: "human", filePath: "", rawBody: "", frontmatter: { audience: "human", block: "intake", source: "hand", title: "Overview", order: 1 } as any },
      { slug: "intake/recipes", audience: "human", filePath: "", rawBody: "", frontmatter: { audience: "human", block: "intake", source: "hand", title: "Recipes", order: 2 } as any },
    ],
  },
  {
    blockId: "fraud-score", blockTitle: "Fraud Score", order: 2,
    pages: [
      { slug: "fraud-score/index", audience: "human", filePath: "", rawBody: "", frontmatter: { audience: "human", block: "fraud-score", source: "hand", title: "Overview", order: 1 } as any },
    ],
  },
];

describe("prev/next", () => {
  it("returns null prev for the very first page", () => {
    const { prev, next } = computePrevNext(tree, "intake/index");
    expect(prev).toBeNull();
    expect(next?.slug).toBe("intake/recipes");
  });

  it("wraps across blocks", () => {
    const { prev, next } = computePrevNext(tree, "intake/recipes");
    expect(prev?.slug).toBe("intake/index");
    expect(next?.slug).toBe("fraud-score/index");
  });

  it("returns null next for the very last page", () => {
    const { prev, next } = computePrevNext(tree, "fraud-score/index");
    expect(prev?.slug).toBe("intake/recipes");
    expect(next).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-prev-next.test.ts`

- [ ] **Step 3: Implement component**

```tsx
// crm-node/src/components/docs/PrevNext.tsx
import Link from "next/link";
import type { DocsNode, DocsPage } from "@/lib/docs-content";

export function computePrevNext(
  tree: DocsNode[],
  currentSlug: string,
): { prev: DocsPage | null; next: DocsPage | null } {
  const flat = tree.flatMap((n) => n.pages);
  const idx = flat.findIndex((p) => p.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return { prev: idx > 0 ? flat[idx - 1] : null, next: idx < flat.length - 1 ? flat[idx + 1] : null };
}

export function PrevNext({ tree, currentSlug }: { tree: DocsNode[]; currentSlug: string }) {
  const { prev, next } = computePrevNext(tree, currentSlug);
  return (
    <nav className="mt-12 flex items-center justify-between gap-4 border-t pt-6 text-sm">
      {prev ? (
        <Link href={`/docs/${prev.slug}`} className="group flex flex-col items-start gap-1">
          <span className="text-muted-foreground">← Previous</span>
          <span className="font-medium group-hover:underline">{prev.frontmatter.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link href={`/docs/${next.slug}`} className="group flex flex-col items-end gap-1 text-right">
          <span className="text-muted-foreground">Next →</span>
          <span className="font-medium group-hover:underline">{next.frontmatter.title}</span>
        </Link>
      ) : <span />}
    </nav>
  );
}
```

- [ ] **Step 4: Wire into page**

In `crm-node/src/app/(docs)/docs/[...slug]/page.tsx`, after `{content}` inside `<article>`:
```tsx
import { PrevNext } from "@/components/docs/PrevNext";
// ... inside the component JSX
<PrevNext tree={tree} currentSlug={joined} />
```

- [ ] **Step 5: Run test**

Run: `pnpm vitest run tests/unit/docs-prev-next.test.ts`
Expected: 3 PASS.

- [ ] **Step 6: Commit**

```bash
git add crm-node/src/components/docs/PrevNext.tsx crm-node/src/app/\(docs\) crm-node/tests/unit/docs-prev-next.test.ts
git commit -m "feat(docs): prev/next pagination"
```

---

### Task 7: Sitemap + robots.txt excluding `_deep/`

**Files:**
- Create: `crm-node/src/app/sitemap.ts` (or extend existing)
- Modify: `crm-node/src/app/robots.ts` (create if missing)
- Test: `crm-node/tests/integration/docs-sitemap.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/integration/docs-sitemap.test.ts
import { describe, it, expect } from "vitest";

describe("/sitemap.xml + /robots.txt", () => {
  it("sitemap lists every human docs slug", async () => {
    const res = await fetch("http://localhost:3000/sitemap.xml");
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toMatch(/\/docs\/intake\//);
    expect(xml).not.toMatch(/_deep/);
  });

  it("robots.txt disallows _deep paths", async () => {
    const res = await fetch("http://localhost:3000/robots.txt");
    const txt = await res.text();
    expect(txt).toMatch(/Disallow: \/_deep/);
  });
});
```

- [ ] **Step 2: Implement sitemap**

```ts
// crm-node/src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { loadDocsTree } from "@/lib/docs-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://crm-node.fly.dev";
  const tree = await loadDocsTree({ root: "content/docs" });
  const docs = tree.flatMap((n) =>
    n.pages.map((p) => ({
      url: `${base}/docs/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  );
  return [
    { url: `${base}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${base}/docs`, lastModified: new Date(), priority: 0.9 },
    ...docs,
  ];
}
```

- [ ] **Step 3: Implement robots**

```ts
// crm-node/src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://crm-node.fly.dev";
  return {
    rules: [
      { userAgent: "*", allow: "/docs", disallow: ["/_deep", "/dashboard", "/api", "/super-admin"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Run test**

Run:
```bash
pnpm dev
pnpm vitest run tests/integration/docs-sitemap.test.ts
```
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/app/sitemap.ts crm-node/src/app/robots.ts crm-node/tests/integration/docs-sitemap.test.ts
git commit -m "feat(docs): sitemap + robots.txt with _deep disallow"
```

---

### Task 8: Dark mode + design tokens alignment

**Files:**
- Modify: `crm-node/src/app/(docs)/docs/layout.tsx`
- Modify: `crm-node/src/app/globals.css` (docs-specific overrides)
- Test: manual smoke (Lighthouse a11y ≥ 95)

- [ ] **Step 1: Add theme toggle to layout**

```tsx
// at top of DocsLayout, before the aside
import { ThemeToggle } from "@/components/shell/ThemeToggle";  // reuse existing

// inside the returned JSX, above the grid:
<header className="mb-6 flex items-center justify-between">
  <a href="/docs" className="text-lg font-semibold">GambChamp Docs</a>
  <ThemeToggle />
</header>
```

- [ ] **Step 2: Add Tailwind typography to docs scope**

Confirm `@tailwindcss/typography` is already in deps (used by dashboard). If not:
```bash
pnpm add -D @tailwindcss/typography
```
Add plugin in `tailwind.config.ts` — re-check that the docs pages use `prose prose-neutral dark:prose-invert` (already applied in Task 5).

- [ ] **Step 3: Smoke in browser**

Start `pnpm dev`, open `http://localhost:3000/docs`, toggle dark mode, confirm readable.

- [ ] **Step 4: Lighthouse audit (manual)**

Run Chrome DevTools Lighthouse on `/docs` and `/docs/intake/index`. Target: a11y ≥ 95, perf ≥ 90. Fix any missing `alt`, low-contrast issue, or oversized hero font.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/app/\(docs\) crm-node/src/app/globals.css
git commit -m "feat(docs): dark-mode header + theme toggle in docs layout"
```

---

### Task 9: E2E smoke — full navigation works

**Files:**
- Create: `crm-node/tests/e2e/docs-subsite.test.ts`

- [ ] **Step 1: Write failing E2E**

```ts
// crm-node/tests/e2e/docs-subsite.test.ts
import { describe, it, expect } from "vitest";

describe("docs subsite e2e", () => {
  it("landing → block page → next page chain works", async () => {
    const landingRes = await fetch("http://localhost:3000/docs");
    expect(landingRes.status).toBe(200);
    const landing = await landingRes.text();
    const firstBlockHref = landing.match(/href="(\/docs\/[^"]+)"/)?.[1];
    expect(firstBlockHref).toBeTruthy();

    const pageRes = await fetch(`http://localhost:3000${firstBlockHref}`);
    expect(pageRes.status).toBe(200);
    const page = await pageRes.text();
    // prev/next nav rendered
    expect(page).toMatch(/Next →|Previous ←|← Previous/);
  });

  it("_deep paths are hidden everywhere (nav + routing + robots)", async () => {
    const pages = ["/docs", "/docs/intake/index"];
    for (const path of pages) {
      const res = await fetch(`http://localhost:3000${path}`);
      const html = await res.text();
      expect(html).not.toMatch(/\/_deep\//);
    }
    const robots = await (await fetch("http://localhost:3000/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/_deep/);
  });
});
```

- [ ] **Step 2: Run**

Run:
```bash
pnpm dev
pnpm vitest run tests/e2e/docs-subsite.test.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add crm-node/tests/e2e/docs-subsite.test.ts
git commit -m "test(docs): e2e smoke for /docs subsite"
```

---

### Task 10: `CHANGELOG.md` + READINESS flip

- [ ] **Step 1: Append to CHANGELOG**

```markdown
## Unreleased — Docs subsite skeleton

- **/docs route.** Public Next.js App Router pages at `/docs`. MDX pipeline via `next-mdx-remote` v5 RSC mode with `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-pretty-code`.
- **Two-tier content.** Frontmatter Zod schema (`audience: human | ai-deep`). Content loader walks `content/docs/` excluding `_deep/` for the human-facing tree; plan #4 + #6 use the `includeDeep: true` variant.
- **Nav.** Sidebar auto-generated from block catalog (24 blocks), breadcrumbs, TOC from H2/H3, prev/next across blocks.
- **SEO.** Sitemap + robots.txt with `_deep` Disallow.
```

- [ ] **Step 2: READINESS**

```markdown
- [x] /docs subsite skeleton + two-tier content loader — #2026-04-22-docs-02
```

- [ ] **Step 3: typecheck + lint + test**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm vitest run tests/unit/docs tests/integration/docs-route.test.ts tests/integration/docs-page.test.ts tests/integration/docs-sitemap.test.ts tests/e2e/docs-subsite.test.ts
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add crm-node/CHANGELOG.md crm-node/docs/superpowers/READINESS_CHECKLIST.md
git commit -m "docs: ship /docs skeleton per plan #2026-04-22-docs-02"
```

---

### Task 11: Self-review

- [ ] **Step 1: Spec coverage**

- Route layout ✅ · Landing ✅ · Dynamic page ✅ · Prev/Next ✅ · Sitemap + robots ✅ · Dark mode ✅ · E2E smoke ✅ · `_deep/` hidden everywhere ✅

- [ ] **Step 2: Placeholder scan**

All component files implemented inline; no TODO comments introduced. Lighthouse smoke is manual but explicitly called out.

- [ ] **Step 3: Handoff**

Print: "Plan #2 complete. `/docs` is live with skeleton MDX pages for all 24 blocks. Proceed to plan #3 to fill human content for the v1 scope (top 10 blocks)."
