// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAskStream } from "@/components/docs/useAskStream";

function sseBody(events: Array<{ event?: string; data: string }>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const e of events) {
        if (e.event) c.enqueue(enc.encode(`event: ${e.event}\n`));
        c.enqueue(enc.encode(`data: ${e.data}\n\n`));
      }
      c.close();
    },
  });
}

describe("useAskStream", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(sseBody([
        { event: "citations", data: JSON.stringify([{ id: "c1", slug: "s", title: "T", audience: "human", anchor: null }]) },
        { data: JSON.stringify({ t: "Hello " }) },
        { data: JSON.stringify({ t: "world." }) },
        { event: "done", data: "{}" },
      ]), { status: 200 }),
    ));
  });

  it("streams tokens and collects citations", async () => {
    const { result } = renderHook(() => useAskStream());
    await act(async () => { await result.current.ask("hi"); });
    expect(result.current.state.status).toBe("done");
    expect(result.current.state.answer).toBe("Hello world.");
    expect(result.current.state.citations.length).toBe(1);
  });

  it("flags rate limit on 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));
    const { result } = renderHook(() => useAskStream());
    await act(async () => { await result.current.ask("x"); });
    expect(result.current.state.status).toBe("rate_limited");
  });
});
