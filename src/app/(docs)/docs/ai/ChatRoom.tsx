"use client";
import { AnswerMarkdown } from "@/components/docs/AnswerMarkdown";
import { type Citation, useAskStream } from "@/components/docs/useAskStream";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string; citations?: Citation[] };

export function ChatRoom() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const { state, ask, cancel, reset } = useAskStream();
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on content change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.answer, turns.length]);

  useEffect(() => {
    if (state.status === "done" && state.answer) {
      setTurns((t) => [
        ...t,
        { role: "assistant", content: state.answer, citations: state.citations },
      ]);
      reset();
    }
  }, [state.status, state.answer, state.citations, reset]);

  const submit = async () => {
    if (!input.trim() || state.status === "streaming") return;
    const q = input.trim();
    setInput("");
    setTurns((t) => [...t, { role: "user", content: q }]);
    await ask(
      q,
      turns.slice(-6).map((t) => ({ role: t.role, content: t.content })),
    );
  };

  return (
    <div className="mt-6 flex h-[calc(100vh-16rem)] flex-col rounded-lg border">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {turns.map((t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: chat turns have no stable id
          <div key={i} className={cn("rounded-md p-3", t.role === "user" ? "bg-muted" : "border")}>
            {t.role === "assistant" ? (
              <AnswerMarkdown text={t.content} citations={t.citations ?? []} />
            ) : (
              <div className="whitespace-pre-wrap">{t.content}</div>
            )}
          </div>
        ))}
        {state.status === "streaming" && (
          <div className="rounded-md border p-3">
            <AnswerMarkdown text={state.answer || "…"} citations={state.citations} />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2 border-t p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about the CRM…"
          className="flex-1 rounded border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        {state.status === "streaming" ? (
          <button type="button" onClick={cancel} className="rounded border px-3 py-2 text-sm">
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-40"
          >
            Ask
          </button>
        )}
      </form>
    </div>
  );
}
