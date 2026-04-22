import { streamChat } from "@/server/docs/ollama-chat";
import { beforeEach, describe, expect, it, vi } from "vitest";

const CHUNKS = [
  `${JSON.stringify({ message: { content: "Hello" }, done: false })}\n`,
  `${JSON.stringify({ message: { content: " world" }, done: false })}\n`,
  `${JSON.stringify({ message: { content: "." }, done: true })}\n`,
];

describe("streamChat", () => {
  beforeEach(() => {
    // biome-ignore lint/performance/noDelete: need undefined semantics, not the string "undefined"
    delete process.env.OLLAMA_AUTH_TOKEN;
  });

  it("yields token deltas parsed from Ollama chat stream", async () => {
    const enc = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        for (const c of CHUNKS) controller.enqueue(enc.encode(c));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";

    const out: string[] = [];
    for await (const delta of streamChat({
      messages: [{ role: "user", content: "hi" }],
    })) {
      out.push(delta);
    }
    expect(out).toEqual(["Hello", " world", "."]);
  });

  it("sends auth header when OLLAMA_AUTH_TOKEN is set", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    process.env.OLLAMA_AUTH_TOKEN = "secret";
    const gen = streamChat({ messages: [{ role: "user", content: "x" }] });
    await gen.next();
    expect(fetchSpy.mock.calls[0][1].headers["x-ollama-auth"]).toBe("secret");
  });
});
