import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { BLOCK_CATALOG } from "../../scripts/docs-regen/block-catalog";
import { type DocsFrontmatter, parseDocsFrontmatter } from "./docs-frontmatter";

export interface DocsPage {
  slug: string;
  filePath: string;
  audience: "human" | "ai-deep";
  frontmatter: DocsFrontmatter;
  rawBody: string;
}

export interface DocsNode {
  blockId: string;
  blockTitle: string;
  order: number;
  pages: DocsPage[];
}

export interface LoadOpts {
  root: string;
  cwd?: string;
  includeDeep?: boolean;
}

export async function loadDocsTree(opts: LoadOpts): Promise<DocsNode[]> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg(`${opts.root}/**/*.{md,mdx}`, {
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
      // Skip files with invalid frontmatter (e.g. fixture/scaffold test dirs)
      // to avoid breaking the nav tree for real files.
      // Re-throw only for files that look like real content (known block prefix).
      const msg = (e as Error).message;
      if (msg.includes("block must be a valid block id")) {
        continue;
      }
      throw new Error(`Invalid docs frontmatter in ${file}: ${msg}`);
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
    const pages = (byBlock.get(b.id) ?? []).sort(
      (a, z) =>
        a.frontmatter.order - z.frontmatter.order ||
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
