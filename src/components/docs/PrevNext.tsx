import type { DocsNode, DocsPage } from "@/lib/docs-content";
import Link from "next/link";

export function computePrevNext(
  tree: DocsNode[],
  currentSlug: string,
): { prev: DocsPage | null; next: DocsPage | null } {
  const flat = tree.flatMap((n) => n.pages);
  const idx = flat.findIndex((p) => p.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

export function PrevNext({ tree, currentSlug }: { tree: DocsNode[]; currentSlug: string }) {
  const { prev, next } = computePrevNext(tree, currentSlug);
  return (
    <nav className="mt-12 flex items-center justify-between gap-4 border-t pt-6 text-sm">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}` as never}
          className="group flex flex-col items-start gap-1"
        >
          <span className="text-muted-foreground">← Previous</span>
          <span className="font-medium group-hover:underline">{prev.frontmatter.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug}` as never}
          className="group flex flex-col items-end gap-1 text-right"
        >
          <span className="text-muted-foreground">Next →</span>
          <span className="font-medium group-hover:underline">{next.frontmatter.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
