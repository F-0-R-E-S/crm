import { chunkMarkdown } from "@/server/docs/chunker";
import { describe, expect, it } from "vitest";

describe("chunker", () => {
  it("splits human docs on H2/H3 boundaries, target ~500 tokens", () => {
    const md = [
      "# Intake",
      "Opening para.",
      "## Dedup",
      "Dedup details here.",
      "### email_phone_daily",
      "Rule...",
      "## Fraud",
      "Fraud details.",
    ].join("\n\n");
    const chunks = chunkMarkdown({
      text: md,
      audience: "human",
      slug: "intake/index",
      block: "intake",
      kind: "overview",
      title: "Intake",
    });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].title).toMatch(/Intake|Dedup|Fraud|_intro_/);
    expect(chunks.every((c) => c.tokens <= 700)).toBe(true);
  });

  it("splits ai-deep docs much finer (~150 tokens per H1) and preserves anchor", () => {
    const md = [
      "# Lead",
      '<a id="db-lead"></a>',
      "- id: String",
      "- state: LeadState",
      "# LeadEvent",
      '<a id="db-leadevent"></a>',
      "- id: String",
    ].join("\n\n");
    const chunks = chunkMarkdown({
      text: md,
      audience: "ai-deep",
      slug: "intake/_deep/db-schema",
      block: "intake",
      kind: "prisma",
      title: "DB Schema",
    });
    expect(chunks.length).toBe(2);
    expect(chunks[0].anchor).toBe("db-lead");
    expect(chunks[1].anchor).toBe("db-leadevent");
  });

  it("produces deterministic chunk ids (hash-based)", () => {
    const md = "# A\nbody\n# B\nbody";
    const a = chunkMarkdown({
      text: md,
      audience: "human",
      slug: "x/y",
      block: "intake",
      kind: "overview",
      title: "X",
    });
    const b = chunkMarkdown({
      text: md,
      audience: "human",
      slug: "x/y",
      block: "intake",
      kind: "overview",
      title: "X",
    });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});
