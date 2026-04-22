"use client";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation } from "./useAskStream";

export function AnswerMarkdown({ text, citations }: { text: string; citations: Citation[] }) {
  const citedText = text.replace(/\[(\d+)\]/g, (m, n) => {
    const idx = Number(n) - 1;
    const c = citations[idx];
    if (!c) return m;
    const href = `/docs/${c.slug}${c.anchor ? `#${c.anchor}` : ""}`;
    return `[\\[${n}\\]](${href})`;
  });
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a
              {...props}
              className="underline hover:text-foreground"
              target={props.href?.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            />
          ),
        }}
      >
        {citedText}
      </ReactMarkdown>
      {citations.length > 0 && (
        <div className="mt-4 border-t pt-3 text-xs">
          <div className="mb-1 font-semibold">Sources</div>
          <ol className="space-y-1">
            {citations.map((c, i) => (
              <li key={c.id}>
                [{i + 1}]{" "}
                <Link
                  href={`/docs/${c.slug}${c.anchor ? `#${c.anchor}` : ""}` as never}
                  className="underline"
                >
                  {c.title}
                </Link>{" "}
                <span className="text-muted-foreground">
                  ({c.audience === "ai-deep" ? "deep reference" : c.slug})
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
