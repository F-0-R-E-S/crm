"use client";
import { useCallback, useRef, useState } from "react";
import { createParser } from "eventsource-parser";

export interface Citation {
  id: string;
  slug: string;
  title: string;
  audience: "human" | "ai-deep";
  anchor: string | null;
}

export interface AskState {
  status: "idle" | "streaming" | "done" | "error" | "rate_limited";
  answer: string;
  citations: Citation[];
  error?: string;
}

type PriorTurn = { role: "user" | "assistant"; content: string };

export function useAskStream(): {
  state: AskState;
  ask: (question: string, priorTurns?: PriorTurn[]) => Promise<void>;
  cancel: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<AskState>({ status: "idle", answer: "", citations: [] });
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => setState({ status: "idle", answer: "", citations: [] }), []);

  const ask = useCallback(async (question: string, priorTurns?: PriorTurn[]) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ status: "streaming", answer: "", citations: [] });

    const res = await fetch("/api/docs/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, priorTurns }),
      signal: ac.signal,
    });

    if (res.status === 429) {
      setState({ status: "rate_limited", answer: "", citations: [], error: "Too many questions — wait a minute." });
      return;
    }
    if (!res.ok || !res.body) {
      setState({ status: "error", answer: "", citations: [], error: `HTTP ${res.status}` });
      return;
    }

    const parser = createParser({
      onEvent(evt) {
        if (evt.event === "citations") {
          const cits = JSON.parse(evt.data) as Citation[];
          setState((s) => ({ ...s, citations: cits }));
          return;
        }
        if (evt.event === "error") {
          setState((s) => ({ ...s, status: "error", error: JSON.parse(evt.data).message }));
          return;
        }
        if (evt.event === "done") {
          setState((s) => ({ ...s, status: "done" }));
          return;
        }
        const { t } = JSON.parse(evt.data);
        setState((s) => ({ ...s, answer: s.answer + t }));
      },
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
  }, []);

  return { state, ask, cancel, reset };
}
