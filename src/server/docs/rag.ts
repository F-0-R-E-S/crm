import type { ChatMessage } from "./ollama-chat";

// Local minimal interface. Plan #4 will export a richer `SearchHit` from search.ts;
// once that lands, swap this import with `import type { SearchHit } from "./search"`.
export interface RagHit {
  id: string;
  slug: string;
  audience: "human" | "ai-deep";
  block: string;
  title: string;
  body: string;
  snippet: string;
  anchor: string | null;
  score: number;
}

const SYSTEM_PROMPT_V1 = `You are the GambChamp CRM documentation assistant. Your answers must be grounded exclusively in the provided context passages, cited with [n] references.

Strict rules:
1. Answer ONLY using the context passages marked [1], [2], … below. You must NOT use outside knowledge.
2. When you use a fact, cite its number inline like [1] or [2]. Multiple cites: [1][3].
3. If the context does not contain the answer, reply exactly: "I don't have enough documented context to answer that confidently." and suggest the closest topic from the context, if any.
4. Keep answers concise (≤200 words by default, longer only if the question clearly asks for detail).
5. Format code with fenced blocks; use proper Markdown for lists and tables.
6. Never invent file paths, env vars, model names, or API fields that do not appear in the context.`;

export interface BuildRagInput {
  question: string;
  hits: RagHit[];
  priorTurns?: ChatMessage[];
}

export function formatContextBlock(hits: RagHit[]): string {
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] ${h.slug}${h.anchor ? `#${h.anchor}` : ""} (${h.audience}, block=${h.block})\n` +
        `Title: ${h.title}\n` +
        `${h.body}`,
    )
    .join("\n\n---\n\n");
}

export function buildRagPrompt(input: BuildRagInput): ChatMessage[] {
  const system =
    SYSTEM_PROMPT_V1 +
    (input.hits.length === 0
      ? `\n\nThe context is empty. Follow rule 3 and refuse.`
      : `\n\n--- CONTEXT ---\n${formatContextBlock(input.hits)}\n--- END CONTEXT ---`);
  const messages: ChatMessage[] = [{ role: "system", content: system }];
  if (input.priorTurns?.length) messages.push(...input.priorTurns);
  messages.push({ role: "user", content: input.question });
  return messages;
}
