"use client";

import type { DocsNode } from "@/lib/docs-content";
import { cn } from "@/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ tree }: { tree: DocsNode[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6 text-sm">
      {tree.map((node) => (
        <div key={node.blockId}>
          <h3 className="mb-2 font-semibold">{node.blockTitle}</h3>
          <ul className="space-y-1">
            {node.pages.map((p) => {
              const href = `/docs/${p.slug}` as Route;
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
      <div>
        <h3 className="mb-2 font-semibold">Reference</h3>
        <ul className="space-y-1">
          <li>
            <Link
              href={"/docs/api" as Route}
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
    </nav>
  );
}
