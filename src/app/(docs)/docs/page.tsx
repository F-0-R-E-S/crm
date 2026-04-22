import { loadDocsTree } from "@/lib/docs-content";
import type { Route } from "next";
import Link from "next/link";

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
          Browse by feature block. Every block has an overview, recipes, and concepts.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tree.map((node) => (
          <Link
            key={node.blockId}
            href={`/docs/${node.pages[0].slug}` as Route}
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
