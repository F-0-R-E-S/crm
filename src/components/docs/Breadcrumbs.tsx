import type { Route } from "next";
import Link from "next/link";

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap gap-1">
        {trail.map((t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional breadcrumb items are stable
          <li key={i} className="flex items-center gap-1">
            {t.href ? (
              <Link href={t.href as Route} className="hover:text-foreground">
                {t.label}
              </Link>
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
