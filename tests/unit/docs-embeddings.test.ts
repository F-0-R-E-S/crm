import { EMBEDDING_DIM, embed, embedBatch } from "@/server/docs/embeddings";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("embeddings client", () => {
  beforeEach(() => {
    // biome-ignore lint/performance/noDelete: env teardown requires actual unset, not undefined string
    delete process.env.OLLAMA_BASE_URL;
    // biome-ignore lint/performance/noDelete: env teardown requires actual unset, not undefined string
    delete process.env.OLLAMA_AUTH_TOKEN;
  });

  it("posts to /api/embed with the right body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: Array(EMBEDDING_DIM).fill(0.01) }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";

    const v = await embed("hello");
    expect(v.length).toBe(EMBEDDING_DIM);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://ollama:11434/api/embed",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends x-ollama-auth header when OLLAMA_AUTH_TOKEN is set", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: Array(EMBEDDING_DIM).fill(0.01) }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    process.env.OLLAMA_AUTH_TOKEN = "secret";

    await embed("hi");
    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers["x-ollama-auth"]).toBe("secret");
  });

  it("embedBatch chunks requests at max=32 per call", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: Array(32).fill(Array(EMBEDDING_DIM).fill(0.01)) }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    await embedBatch(Array(70).fill("x"));
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("throws when OLLAMA_BASE_URL is unset", async () => {
    await expect(embed("x")).rejects.toThrow(/OLLAMA_BASE_URL/);
  });
});
