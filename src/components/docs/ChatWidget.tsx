"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { useAskStream } from "./useAskStream";

type Turn = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const { state, ask, cancel, reset } = useAskStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on content change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state.answer, turns.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async () => {
    if (!input.trim() || state.status === "streaming") return;
    const q = input.trim();
    setInput("");
    setTurns((t) => [...t, { role: "user", content: q }]);
    await ask(q, turns.slice(-6));
  };

  useEffect(() => {
    if (state.status === "done" && state.answer) {
      setTurns((t) => [...t, { role: "assistant", content: state.answer }]);
      reset();
    }
  }, [state.status, state.answer, reset]);

  return (
    <>
      <button
        type="button"
        aria-label="Ask the docs (Alt+K)"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg hover:opacity-90",
          open && "pointer-events-none opacity-0",
        )}
      >
        Ask the docs
      </button>
      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[560px] w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-lg border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-semibold">Ask the docs</div>
            <div className="flex gap-2">
              {state.status === "streaming" && (
                <button type="button" onClick={cancel} className="text-xs underline">
                  stop
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </header>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-3 text-sm">
            {turns.length === 0 && state.answer.length === 0 && (
              <div className="text-muted-foreground">
                Grounded Q&amp;A over the documentation. The assistant answers only from what&apos;s
                written here and cites sources.
              </div>
            )}
            {turns.map((t, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: chat turns have no stable id
              <div key={i} className={cn("rounded p-2", t.role === "user" ? "bg-muted" : "border")}>
                {t.role === "assistant" ? (
                  <AnswerMarkdown text={t.content} citations={[]} />
                ) : (
                  <div className="whitespace-pre-wrap">{t.content}</div>
                )}
              </div>
            ))}
            {state.status === "streaming" && (
              <div className="rounded border p-2">
                <AnswerMarkdown text={state.answer || "…"} citations={state.citations} />
              </div>
            )}
            {state.status === "rate_limited" && (
              <div className="rounded border border-amber-500/50 bg-amber-500/5 p-2 text-amber-800 dark:text-amber-200">
                {state.error}
              </div>
            )}
            {state.status === "error" && (
              <div className="rounded border border-rose-500/50 bg-rose-500/5 p-2">
                Something went wrong: {state.error}
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex gap-2 border-t p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || state.status === "streaming"}
              className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </>
  );
}
