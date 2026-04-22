import { type RagHit, buildRagPrompt, formatContextBlock } from "@/server/docs/rag";
import { describe, expect, it } from "vitest";

const hit = (overrides: Partial<RagHit>): RagHit => ({
  id: "c1",
  slug: "intake/index",
  title: "Intake",
  body: "Intake body.",
  audience: "human",
  block: "intake",
  anchor: null,
  snippet: "",
  score: 1,
  ...overrides,
});

describe("rag prompt", () => {
  it("formats a context block with numbered citations + source slug", () => {
    const out = formatContextBlock([hit({ id: "c1", title: "Intake", body: "Intake body." })]);
    expect(out).toMatch(/\[1\] intake\/index/);
    expect(out).toMatch(/Intake body/);
  });

  it("builds a messages array with system prompt + context + question", () => {
    const messages = buildRagPrompt({
      question: "What is a flow?",
      hits: [
        hit({
          slug: "routing-engine/concepts",
          title: "Flow",
          body: "A flow is…",
          block: "routing-engine",
        }),
      ],
    });
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toMatch(/grounded/i);
    expect(messages[0].content).toMatch(/\[n\]/);
    expect(messages[messages.length - 1].content).toBe("What is a flow?");
  });

  it("emits a refusal system-prompt suffix when hits is empty", () => {
    const messages = buildRagPrompt({ question: "random", hits: [] });
    const system = messages[0].content;
    expect(system).toMatch(/refuse/i);
  });
});
