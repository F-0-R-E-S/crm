export interface TocEntry {
  depth: 2 | 3;
  text: string;
  slug: string;
}

export function extractToc(markdown: string): TocEntry[] {
  const out: TocEntry[] = [];
  const re = /^(#{2,3})\s+(.+)$/gm;
  for (const m of markdown.matchAll(re)) {
    const depth = m[1].length as 2 | 3;
    const text = m[2].trim().replace(/^`|`$/g, "");
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
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
