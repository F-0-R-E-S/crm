"use client";

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(q), 180);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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
    // biome-ignore lint/suspicious/noExplicitAny: keepPreviousData is a valid TanStack Query v4 option not in the narrow type
    { enabled: debouncedQ.length >= 2, keepPreviousData: true } as any,
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
        // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled by global keydown listener registered in useEffect above
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
                  <div className="text-xs text-muted-foreground">
                    {hit.block} / {hit.slug}
                  </div>
                  <div
                    className="mt-1 line-clamp-2 text-xs text-muted-foreground"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: snippet produced by Postgres ts_headline, not user input
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
