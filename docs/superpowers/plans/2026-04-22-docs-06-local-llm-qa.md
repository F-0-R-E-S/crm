# Docs Subsite Plan #6 — Local LLM Q&A (Qwen3-8B + RAG + Chat Widget/Full Chat)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a grounded-QA experience over the entire docs corpus (human + ai-deep layers). A floating chat widget lives on every `/docs/*` page; a full-chat page at `/docs/ai` serves longer conversations. All answers are retrieval-augmented, cite their sources (clickable into the human layer), and refuse when context is insufficient. Inference runs on **Qwen3-8B-Instruct** served by Ollama on a dedicated Fly GPU machine; the Next.js app streams tokens to the browser via Server-Sent Events.

**Architecture:** A new Fly app (`gambchamp-ollama`) runs Ollama on a GPU machine (L4 or A10), pulls `qwen3:8b-instruct-q5_K_M` and `bge-m3`, exposes the OpenAI-compat endpoint behind a shared-secret header. The main `crm-node` app talks to it via `src/server/docs/ollama-chat.ts` (streaming). The RAG pipeline calls `searchDocs` (plan #4) with `audiences: ["human","ai-deep"]` and `boostAiDeep: true`, formats the top-8 hits into a compact context window (≈4k tokens), prepends a system prompt enforcing grounding + citation, streams tokens back. The browser client consumes an SSE endpoint (`/api/docs/ask`) — tRPC is skipped for the stream because tRPC streaming v11 is still maturing in RSC combinations. Every ask writes a `DocAskEvent` row with the top-k chunk ids + latency + (anonymized) answer for telemetry + eval replays.

**Tech Stack:** Ollama (GPU-backed), `eventsource-parser` for SSE parsing on the client, `react-markdown` + `remark-gfm` for rendering model output safely, `server-sent-events` native support in Next 15 App Router (Edge runtime disabled — we stay on Node for Prisma).

**Spec:** Depends on plans #2 (subsite), #3 (content), #4 (search pipeline). Independent of plan #5.

**Preflight:**
- Plans #2, #3, #4 merged and green.
- Fly CLI installed + authenticated to the org.
- Access to a GPU region (`ord`, `sjc` — `fly platform regions` shows availability).

---

### Task 1: Provision the Fly GPU Ollama machine

**Files:**
- Create: `ops/ollama/fly.toml`
- Create: `ops/ollama/Dockerfile`
- Create: `ops/ollama/entrypoint.sh`
- Create: `crm-node/docs/runbooks/ollama-ops.md`

**Note:** this task runs **outside** `crm-node/`. Create `ops/ollama/` at repo root (`CRM-PRD/ops/ollama/`). Tests are ops-level smoke; no vitest.

- [ ] **Step 1: Dockerfile**

```dockerfile
# ops/ollama/Dockerfile
FROM ollama/ollama:0.5.4

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV OLLAMA_HOST=0.0.0.0:11434
ENV OLLAMA_KEEP_ALIVE=30m
ENV OLLAMA_NUM_PARALLEL=4
ENV OLLAMA_MAX_LOADED_MODELS=2

EXPOSE 11434
ENTRYPOINT ["/entrypoint.sh"]
```

- [ ] **Step 2: Entry-point pulls models on first boot**

```bash
# ops/ollama/entrypoint.sh
#!/bin/sh
set -eu

# Start the server in the background.
ollama serve &
PID=$!

# Wait for readiness.
until curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; do
  sleep 1
done

# Idempotent model pulls (first boot only — cached after).
ollama pull qwen3:8b-instruct-q5_K_M || true
ollama pull bge-m3 || true

wait $PID
```

- [ ] **Step 3: fly.toml**

```toml
# ops/ollama/fly.toml
app = "gambchamp-ollama"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[[mounts]]
  source = "ollama_models"
  destination = "/root/.ollama"
  initial_size = "50gb"

[[services]]
  protocol = "tcp"
  internal_port = 11434

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
  [[services.ports]]
    port = 80
    handlers = ["http"]

[[vm]]
  size = "l40s"           # GPU machine; cheapest option with ≥16 GB VRAM
  gpu_kind = "l40s"
  gpus = 1
  memory = "24gb"
```

If `l40s` isn't available in the target org, fall back to `a10` (smaller VRAM — keep q5_K_M quant which fits).

- [ ] **Step 4: Launch**

```bash
cd ops/ollama
fly launch --no-deploy --name gambchamp-ollama --copy-config
fly volumes create ollama_models --size 50 --region ord
fly deploy
```

Wait for first-boot model pulls (10–20 min, depending on link). Watch: `fly logs -a gambchamp-ollama`.

- [ ] **Step 5: Smoke-test**

```bash
curl -s https://gambchamp-ollama.fly.dev/api/tags | jq '.models[].name'
# Expect: qwen3:8b-instruct-q5_K_M, bge-m3
curl -s -X POST https://gambchamp-ollama.fly.dev/api/generate \
  -H 'content-type: application/json' \
  -d '{"model":"qwen3:8b-instruct-q5_K_M","prompt":"Say hi in 5 words.","stream":false}' | jq .response
```

- [ ] **Step 6: Add minimal auth (shared-secret header)**

Ollama itself has no auth. Put a small auth proxy in front using Caddy:

Update Dockerfile:
```dockerfile
FROM ollama/ollama:0.5.4
RUN apt-get update && apt-get install -y caddy && rm -rf /var/lib/apt/lists/*
COPY entrypoint.sh /entrypoint.sh
COPY Caddyfile /etc/caddy/Caddyfile
RUN chmod +x /entrypoint.sh
EXPOSE 11434
ENTRYPOINT ["/entrypoint.sh"]
```

`ops/ollama/Caddyfile`:
```
:11434 {
  @authed header X-Ollama-Auth {$OLLAMA_AUTH_TOKEN}
  reverse_proxy @authed localhost:11435
  respond 401 "Unauthorized"
}
```

Update `entrypoint.sh` to launch Ollama on `:11435` and Caddy on `:11434`:
```bash
export OLLAMA_HOST=0.0.0.0:11435
ollama serve &
caddy run --config /etc/caddy/Caddyfile &
PID=$!
# ... wait/pull loops as before ...
wait $PID
```

Set the secret:
```bash
fly secrets set OLLAMA_AUTH_TOKEN=$(openssl rand -hex 32) -a gambchamp-ollama
fly deploy
```

Re-smoke: with header OK, without header → 401.

- [ ] **Step 7: Runbook**

```markdown
# ops/ollama runbook — crm-node/docs/runbooks/ollama-ops.md

- **URL:** https://gambchamp-ollama.fly.dev
- **Auth:** shared-secret header `X-Ollama-Auth: $OLLAMA_AUTH_TOKEN` (stored in `crm-node` secrets as `OLLAMA_AUTH_TOKEN`).
- **Models:**
  - `qwen3:8b-instruct-q5_K_M` — Q&A generation.
  - `bge-m3` — embeddings (1024-dim).
- **Rotate auth:** `fly secrets set OLLAMA_AUTH_TOKEN=<new> -a gambchamp-ollama` + mirror in `crm-node`.
- **Upgrade model:** SSH in (`fly ssh console -a gambchamp-ollama`), `ollama pull <new>`, update `DOCS_LLM_MODEL` in crm-node secrets.
- **Scale to zero:** not recommended — cold-start pulls the model from disk (~15s) and frustrates first users. Keep `auto_stop_machines=false` (Fly default).
- **Cost watch:** L40s is ~$2.50/h reserved. Set `fly scale vm-count=0` if budget-cut; restore when needed.
```

- [ ] **Step 8: Commit**

```bash
git add ops/ollama CRM-PRD/crm-node/docs/runbooks/ollama-ops.md
git commit -m "ops: provision Fly GPU ollama with Qwen3-8B + BGE-M3 + Caddy auth proxy"
```

---

### Task 2: Add env vars + mirror the auth header to every call

**Files:**
- Modify: `crm-node/src/lib/env.ts`
- Modify: `crm-node/src/server/docs/embeddings.ts` (add header)

- [ ] **Step 1: Extend env schema**

In `src/lib/env.ts`, add:
```ts
OLLAMA_AUTH_TOKEN: z.string().optional(),
DOCS_LLM_MODEL: z.string().default("qwen3:8b-instruct-q5_K_M"),
DOCS_LLM_MAX_TOKENS: z.coerce.number().int().default(1024),
DOCS_LLM_TEMPERATURE: z.coerce.number().default(0.1),
DOCS_LLM_SYSTEM_PROMPT_VERSION: z.string().default("v1"),
```

Keep `OLLAMA_BASE_URL` (added in plan #4).

- [ ] **Step 2: Propagate auth header in `embeddings.ts`**

```ts
function authHeader(): Record<string, string> {
  const t = process.env.OLLAMA_AUTH_TOKEN;
  return t ? { "x-ollama-auth": t } : {};
}
// then in each fetch: headers: { "content-type": "application/json", ...authHeader() }
```

- [ ] **Step 3: Commit**

```bash
git add crm-node/src/lib/env.ts crm-node/src/server/docs/embeddings.ts
git commit -m "feat(docs): OLLAMA_AUTH_TOKEN + DOCS_LLM_* env vars + auth header on embeddings"
```

---

### Task 3: Ollama chat streaming client

**Files:**
- Create: `crm-node/src/server/docs/ollama-chat.ts`
- Test: `crm-node/tests/unit/docs-ollama-chat.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-ollama-chat.test.ts
import { describe, it, expect, vi } from "vitest";
import { streamChat } from "@/server/docs/ollama-chat";

const CHUNKS = [
  JSON.stringify({ message: { content: "Hello" }, done: false }) + "\n",
  JSON.stringify({ message: { content: " world" }, done: false }) + "\n",
  JSON.stringify({ message: { content: "." }, done: true }) + "\n",
];

describe("streamChat", () => {
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
    const fetchSpy = vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start(c) { c.close(); },
    })));
    vi.stubGlobal("fetch", fetchSpy);
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    process.env.OLLAMA_AUTH_TOKEN = "secret";
    const gen = streamChat({ messages: [{ role: "user", content: "x" }] });
    await gen.next();
    expect(fetchSpy.mock.calls[0][1].headers["x-ollama-auth"]).toBe("secret");
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-ollama-chat.test.ts`

- [ ] **Step 3: Implement streaming client**

```ts
// crm-node/src/server/docs/ollama-chat.ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOpts {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

function baseUrl(): string {
  const u = process.env.OLLAMA_BASE_URL;
  if (!u) throw new Error("OLLAMA_BASE_URL is not set");
  return u.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const t = process.env.OLLAMA_AUTH_TOKEN;
  return t ? { "x-ollama-auth": t } : {};
}

export async function* streamChat(opts: ChatOpts): AsyncGenerator<string, void, unknown> {
  const model = opts.model ?? process.env.DOCS_LLM_MODEL ?? "qwen3:8b-instruct-q5_K_M";
  const temperature = opts.temperature ?? Number(process.env.DOCS_LLM_TEMPERATURE ?? 0.1);
  const maxTokens = opts.maxTokens ?? Number(process.env.DOCS_LLM_MAX_TOKENS ?? 1024);

  const res = await fetch(`${baseUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      stream: true,
      options: { temperature, num_predict: maxTokens },
    }),
    signal: opts.abortSignal,
  });
  if (!res.ok) throw new Error(`ollama chat failed: ${res.status}`);
  if (!res.body) throw new Error("ollama chat returned no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const delta: string | undefined = obj.message?.content;
        if (delta) yield delta;
        if (obj.done) return;
      } catch {
        // Ignore malformed lines — they'll never contain tokens.
      }
    }
  }
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-ollama-chat.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/server/docs/ollama-chat.ts crm-node/tests/unit/docs-ollama-chat.test.ts
git commit -m "feat(docs): streaming Ollama chat client"
```

---

### Task 4: RAG prompt + context builder

**Files:**
- Create: `crm-node/src/server/docs/rag.ts`
- Test: `crm-node/tests/unit/docs-rag.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// crm-node/tests/unit/docs-rag.test.ts
import { describe, it, expect } from "vitest";
import { buildRagPrompt, formatContextBlock } from "@/server/docs/rag";

describe("rag prompt", () => {
  it("formats a context block with numbered citations + source slug", () => {
    const out = formatContextBlock([
      { id: "c1", slug: "intake/index", title: "Intake", snippet: "…", body: "Intake body.", anchor: null, block: "intake", audience: "human", score: 1 },
    ] as any);
    expect(out).toMatch(/\[1\] intake\/index/);
    expect(out).toMatch(/Intake body/);
  });

  it("builds a messages array with system prompt + context + question", () => {
    const messages = buildRagPrompt({
      question: "What is a flow?",
      hits: [{ id: "c1", slug: "routing-engine/concepts", title: "Flow", body: "A flow is…", audience: "human", block: "routing-engine", anchor: null, score: 1, snippet: "" } as any],
    });
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toMatch(/grounded/i);
    expect(messages[0].content).toMatch(/\[n\]/);         // instructs model to cite
    expect(messages[messages.length - 1].content).toBe("What is a flow?");
  });

  it("emits a refusal system-prompt suffix when hits is empty", () => {
    const messages = buildRagPrompt({ question: "random", hits: [] });
    const system = messages[0].content;
    expect(system).toMatch(/refuse/i);
  });
});
```

- [ ] **Step 2: Implement RAG prompt**

```ts
// crm-node/src/server/docs/rag.ts
import type { SearchHit } from "./search";
import type { ChatMessage } from "./ollama-chat";

const SYSTEM_PROMPT_V1 = `You are the GambChamp CRM documentation assistant.

Strict rules:
1. Answer ONLY using the context passages marked [1], [2], … below. You must NOT use outside knowledge.
2. When you use a fact, cite its number inline like [1] or [2]. Multiple cites: [1][3].
3. If the context does not contain the answer, reply exactly: "I don't have enough documented context to answer that confidently." and suggest the closest topic from the context, if any.
4. Keep answers concise (≤200 words by default, longer only if the question clearly asks for detail).
5. Format code with fenced blocks; use proper Markdown for lists and tables.
6. Never invent file paths, env vars, model names, or API fields that do not appear in the context.`;

export interface BuildRagInput {
  question: string;
  hits: SearchHit[];
  priorTurns?: ChatMessage[];  // prior user/assistant exchanges in the same session
}

export function formatContextBlock(hits: SearchHit[]): string {
  return hits.map((h, i) =>
    `[${i + 1}] ${h.slug}${h.anchor ? `#${h.anchor}` : ""} (${h.audience}, block=${h.block})\n` +
    `Title: ${h.title}\n` +
    `${h.body}`
  ).join("\n\n---\n\n");
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
```

- [ ] **Step 3: Run test**

Run: `pnpm vitest run tests/unit/docs-rag.test.ts`
Expected: 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add crm-node/src/server/docs/rag.ts crm-node/tests/unit/docs-rag.test.ts
git commit -m "feat(docs): RAG prompt builder with strict grounding + citations"
```

---

### Task 5: `/api/docs/ask` SSE route

**Files:**
- Create: `crm-node/src/app/api/docs/ask/route.ts`
- Modify: `crm-node/prisma/schema.prisma` (add `DocAskEvent`)
- Test: `crm-node/tests/integration/docs-ask-route.test.ts`

- [ ] **Step 1: Add DocAskEvent model**

Append to `schema.prisma`:
```prisma
model DocAskEvent {
  id          String   @id @default(cuid())
  userId      String?
  tenantId    String?
  question    String
  answer      String   // Full streamed text captured server-side.
  hitsJson    Json     // [{ chunkId, slug, audience, score }]
  latencyMs   Int
  refused     Boolean  @default(false)
  promptVer   String
  modelName   String
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@index([refused])
}
```

Run:
```bash
pnpm prisma migrate dev --name docs_ask_events
```

- [ ] **Step 2: Write failing integration test**

```ts
// crm-node/tests/integration/docs-ask-route.test.ts
import { describe, it, expect, vi } from "vitest";
import { prisma } from "@/server/db";

describe("POST /api/docs/ask (SSE)", () => {
  it("streams tokens and persists a DocAskEvent row", async () => {
    // Mock Ollama + embedding fetches with simple chunked response.
    const mockStream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(JSON.stringify({ message: { content: "Answer." }, done: true }) + "\n"));
        c.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn()
      // embedding call
      .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: Array(1024).fill(0.01) }) })
      // chat stream
      .mockResolvedValueOnce(new Response(mockStream, { status: 200 })));
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";

    const before: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocAskEvent"`;
    const res = await fetch("http://localhost:3000/api/docs/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "What is intake?" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    const txt = await res.text();
    expect(txt).toMatch(/data: /);

    const after: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocAskEvent"`;
    expect(after[0].n).toBe(before[0].n + 1);
  });

  it("rate-limits: 11th request in 60s → 429", async () => {
    for (let i = 0; i < 10; i++) {
      await fetch("http://localhost:3000/api/docs/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: `q${i}` }),
      });
    }
    const res = await fetch("http://localhost:3000/api/docs/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "one more" }),
    });
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 3: Implement SSE route**

```ts
// crm-node/src/app/api/docs/ask/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { searchDocs } from "@/server/docs/search";
import { buildRagPrompt } from "@/server/docs/rag";
import { streamChat } from "@/server/docs/ollama-chat";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  question: z.string().min(3).max(1000),
  priorTurns: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).max(10).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return new Response(JSON.stringify({ error: "bad_request", issues: parsed.error.issues }), { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const rlKey = `docs:ask:${ip}`;
  const allowed = await rateLimit(rlKey, { points: 10, windowSec: 60 });
  if (!allowed) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 });

  const { question, priorTurns } = parsed.data;
  const hits = await searchDocs({
    q: question,
    audiences: ["human", "ai-deep"],
    k: 8,
    boostAiDeep: true,
  });
  const refused = hits.length === 0;
  const messages = buildRagPrompt({ question, hits, priorTurns });

  const encoder = new TextEncoder();
  const t0 = Date.now();
  const modelName = process.env.DOCS_LLM_MODEL ?? "qwen3:8b-instruct-q5_K_M";
  const promptVer = process.env.DOCS_LLM_SYSTEM_PROMPT_VERSION ?? "v1";
  let captured = "";

  const stream = new ReadableStream({
    async start(controller) {
      // First, emit the citation metadata (source list) so the client can render pinned chips as the answer streams.
      controller.enqueue(encoder.encode(
        `event: citations\ndata: ${JSON.stringify(hits.map((h) => ({
          id: h.id, slug: h.slug, title: h.title, audience: h.audience, anchor: h.anchor,
        })))}\n\n`,
      ));

      if (refused) {
        const msg = "I don't have enough documented context to answer that confidently.";
        captured = msg;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: msg })}\n\n`));
      } else {
        try {
          for await (const delta of streamChat({ messages })) {
            captured += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: delta })}\n\n`));
          }
        } catch (e) {
          controller.enqueue(encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: (e as Error).message })}\n\n`,
          ));
        }
      }
      controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
      controller.close();

      // Fire-and-forget persistence (AFTER close — uses a dangling promise).
      await prisma.docAskEvent.create({
        data: {
          userId: null, tenantId: null,
          question,
          answer: captured,
          hitsJson: hits.map((h) => ({
            chunkId: h.id, slug: h.slug, audience: h.audience, score: h.score,
          })),
          latencyMs: Date.now() - t0,
          refused,
          promptVer, modelName,
        },
      }).catch(() => { /* never break the stream */ });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
pnpm dev
pnpm vitest run tests/integration/docs-ask-route.test.ts
```
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/app/api/docs/ask crm-node/prisma crm-node/tests/integration/docs-ask-route.test.ts
git commit -m "feat(docs): /api/docs/ask SSE route with RAG + telemetry + rate-limit"
```

---

### Task 6: Client-side SSE consumer hook

**Files:**
- Create: `crm-node/src/components/docs/useAskStream.ts`
- Test: `crm-node/tests/unit/use-ask-stream.test.tsx`

- [ ] **Step 1: Install parser**

```bash
pnpm add eventsource-parser
```

- [ ] **Step 2: Implement hook**

```ts
// crm-node/src/components/docs/useAskStream.ts
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

export function useAskStream(): {
  state: AskState;
  ask: (question: string, priorTurns?: { role: "user" | "assistant"; content: string }[]) => Promise<void>;
  cancel: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<AskState>({ status: "idle", answer: "", citations: [] });
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => setState({ status: "idle", answer: "", citations: [] }), []);

  const ask = useCallback(async (question: string, priorTurns?: AskState extends never ? never : any) => {
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

    const parser = createParser((evt) => {
      if (evt.type !== "event") return;
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
      // default: data frame carrying a token
      const { t } = JSON.parse(evt.data);
      setState((s) => ({ ...s, answer: s.answer + t }));
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
```

- [ ] **Step 3: Run tests** (jsdom-based hook test)

```tsx
// crm-node/tests/unit/use-ask-stream.test.tsx
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
```

Run: `pnpm vitest run tests/unit/use-ask-stream.test.tsx`
Expected: 2 PASS.

- [ ] **Step 4: Commit**

```bash
git add crm-node/src/components/docs/useAskStream.ts crm-node/tests/unit/use-ask-stream.test.tsx crm-node/package.json crm-node/pnpm-lock.yaml
git commit -m "feat(docs): SSE ask-stream hook"
```

---

### Task 7: Floating chat widget

**Files:**
- Create: `crm-node/src/components/docs/ChatWidget.tsx`
- Create: `crm-node/src/components/docs/AnswerMarkdown.tsx`
- Modify: `crm-node/src/app/(docs)/docs/layout.tsx`
- Test: `crm-node/tests/e2e/docs-chat-widget.test.ts`

- [ ] **Step 1: Install markdown renderer**

```bash
pnpm add react-markdown remark-gfm
```

- [ ] **Step 2: Implement AnswerMarkdown**

```tsx
// crm-node/src/components/docs/AnswerMarkdown.tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation } from "./useAskStream";
import Link from "next/link";

export function AnswerMarkdown({
  text, citations,
}: { text: string; citations: Citation[] }) {
  // Replace [n] inline markers with a styled link to the corresponding citation slug.
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
          a: (props) => <a {...props} className="underline hover:text-foreground" target={props.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" />,
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
                <Link href={`/docs/${c.slug}${c.anchor ? `#${c.anchor}` : ""}`} className="underline">
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
```

- [ ] **Step 3: Implement widget**

```tsx
// crm-node/src/components/docs/ChatWidget.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useAskStream } from "./useAskStream";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const { state, ask, cancel, reset } = useAskStream();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // When a streaming answer completes, roll it into turns[] so the next question has context.
  useEffect(() => {
    if (state.status === "done" && state.answer) {
      setTurns((t) => [...t, { role: "assistant", content: state.answer }]);
      reset();
    }
  }, [state.status]);

  return (
    <>
      <button
        type="button"
        aria-label="Ask the docs (Alt+K)"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg hover:opacity-90",
          open && "opacity-0 pointer-events-none",
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
                <button type="button" onClick={cancel} className="text-xs underline">stop</button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">×</button>
            </div>
          </header>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-3 text-sm">
            {turns.length === 0 && state.answer.length === 0 && (
              <div className="text-muted-foreground">
                Grounded Q&A over the documentation. The assistant answers only from what's written here and cites sources.
              </div>
            )}
            {turns.map((t, i) => (
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
            onSubmit={(e) => { e.preventDefault(); submit(); }}
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
```

- [ ] **Step 4: Mount in docs layout**

In `src/app/(docs)/docs/layout.tsx`, append inside the returned JSX:
```tsx
import { ChatWidget } from "@/components/docs/ChatWidget";
// ...
<ChatWidget />
```

- [ ] **Step 5: E2E smoke**

```ts
// crm-node/tests/e2e/docs-chat-widget.test.ts
import { describe, it, expect } from "vitest";

describe("chat widget", () => {
  it("renders the Ask button on every docs page", async () => {
    const paths = ["/docs", "/docs/intake/index", "/docs/api"];
    for (const p of paths) {
      const res = await fetch(`http://localhost:3000${p}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toMatch(/Ask the docs/);
    }
  });
});
```

Run: `pnpm vitest run tests/e2e/docs-chat-widget.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add crm-node/src/components/docs/ChatWidget.tsx crm-node/src/components/docs/AnswerMarkdown.tsx crm-node/src/app/\(docs\) crm-node/tests/e2e/docs-chat-widget.test.ts crm-node/package.json crm-node/pnpm-lock.yaml
git commit -m "feat(docs): floating chat widget + citations rendering"
```

---

### Task 8: Full chat page `/docs/ai`

**Files:**
- Create: `crm-node/src/app/(docs)/docs/ai/page.tsx`
- Create: `crm-node/src/app/(docs)/docs/ai/ChatRoom.tsx`

- [ ] **Step 1: Implement the page shell**

```tsx
// crm-node/src/app/(docs)/docs/ai/page.tsx
import { Breadcrumbs } from "@/components/docs/Breadcrumbs";
import { ChatRoom } from "./ChatRoom";

export const metadata = {
  title: "Ask the docs — GambChamp CRM",
  description: "Grounded Q&A over the documentation. Every answer cites its sources.",
};

export default function DocsAiPage() {
  return (
    <article className="min-w-0 flex-1">
      <Breadcrumbs trail={[{ label: "Docs", href: "/docs" }, { label: "Ask the AI" }]} />
      <h1 className="text-3xl font-semibold">Ask the docs</h1>
      <p className="my-2 text-muted-foreground">
        The assistant answers only from what's documented here and cites sources. If context is thin, it refuses.
      </p>
      <ChatRoom />
    </article>
  );
}
```

- [ ] **Step 2: Reuse the widget logic in a larger layout**

```tsx
// crm-node/src/app/(docs)/docs/ai/ChatRoom.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useAskStream } from "@/components/docs/useAskStream";
import { AnswerMarkdown } from "@/components/docs/AnswerMarkdown";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string; citations?: any[] };

export function ChatRoom() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const { state, ask, cancel, reset } = useAskStream();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.answer, turns.length]);

  useEffect(() => {
    if (state.status === "done" && state.answer) {
      setTurns((t) => [...t, { role: "assistant", content: state.answer, citations: state.citations }]);
      reset();
    }
  }, [state.status]);

  const submit = async () => {
    if (!input.trim() || state.status === "streaming") return;
    const q = input.trim();
    setInput("");
    setTurns((t) => [...t, { role: "user", content: q }]);
    await ask(q, turns.slice(-6).map((t) => ({ role: t.role, content: t.content })));
  };

  return (
    <div className="mt-6 flex h-[calc(100vh-16rem)] flex-col rounded-lg border">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {turns.map((t, i) => (
          <div key={i} className={cn("rounded-md p-3", t.role === "user" ? "bg-muted" : "border")}>
            {t.role === "assistant"
              ? <AnswerMarkdown text={t.content} citations={(t.citations ?? []) as any} />
              : <div className="whitespace-pre-wrap">{t.content}</div>}
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
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex gap-2 border-t p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about the CRM…"
          className="flex-1 rounded border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        {state.status === "streaming"
          ? <button type="button" onClick={cancel} className="rounded border px-3 py-2 text-sm">Stop</button>
          : <button type="submit" disabled={!input.trim()} className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-40">Ask</button>}
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Link from sidebar**

In `Sidebar.tsx`, under the "Reference" group added in plan #5, add:
```tsx
<li>
  <Link href="/docs/ai" className="block rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
    Ask the AI
  </Link>
</li>
```

- [ ] **Step 4: Smoke test**

```bash
pnpm dev
# browser: http://localhost:3000/docs/ai — ask "What is a flow?"
```

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/app/\(docs\)/docs/ai crm-node/src/components/docs/Sidebar.tsx
git commit -m "feat(docs): /docs/ai full chat page"
```

---

### Task 9: Eval set

**Files:**
- Create: `crm-node/tests/eval/docs-qa-eval.test.ts`
- Create: `crm-node/tests/eval/fixtures/qa-set.json`

- [ ] **Step 1: Author 20 known-answer Q/A pairs**

```json
// crm-node/tests/eval/fixtures/qa-set.json
[
  { "q": "What HTTP method do I use to push a lead?", "mustInclude": ["POST", "/api/v1/leads"] },
  { "q": "What is the default fraud auto-reject threshold?", "mustInclude": ["80"] },
  { "q": "How do I set a per-country cap?", "mustInclude": ["CapCountryLimit", "perCountry"] },
  { "q": "Which algorithm uses CSPRNG?", "mustInclude": ["Slots-Chance"] },
  { "q": "What does PENDING_HOLD protect against?", "mustInclude": ["shave"] },
  { "q": "Where do I configure the retry ladder?", "mustInclude": ["Broker.retrySchedule"] },
  { "q": "Which env var disables the 3-domain pattern?", "mustInclude": ["ROOT_DOMAIN"] },
  { "q": "What Telegram event fires when a lead is first received?", "mustInclude": ["NEW_LEAD"] },
  { "q": "What is the CRG cohort window?", "mustInclude": ["Monday", "weekly"] },
  { "q": "What plan tiers exist?", "mustInclude": ["Starter", "Growth", "Pro"] },
  { "q": "How many retries does the outbound webhook ladder have?", "mustInclude": ["5"] },
  { "q": "What does borderline mean for a lead?", "mustInclude": ["needsReview"] },
  { "q": "Which Prisma model stores conversions?", "mustInclude": ["Conversion"] },
  { "q": "Which status-mapping kinds exist?", "mustInclude": ["QUALIFIED", "CONVERTED", "REJECTED"] },
  { "q": "Which HTTP status signals over-quota?", "mustInclude": ["429", "plan_quota_exceeded"] },
  { "q": "What is the default manual-queue depth alert threshold?", "mustInclude": ["25"] },
  { "q": "How is a lead deduped?", "mustInclude": ["email", "phone"] },
  { "q": "Which environment must OLLAMA_BASE_URL point to?", "mustInclude": ["Ollama"] },
  { "q": "Which route serves the sitemap?", "mustInclude": ["/sitemap.xml"] },
  { "q": "Tell me about quantum entanglement", "mustInclude": ["don't have enough"] }
]
```

- [ ] **Step 2: Implement eval harness**

```ts
// crm-node/tests/eval/docs-qa-eval.test.ts
import { describe, it, expect } from "vitest";
import qaSet from "./fixtures/qa-set.json";

const runEval = process.env.RUN_EVAL === "1";

describe.skipIf(!runEval)("docs Q&A eval set", () => {
  for (const pair of qaSet) {
    it(`Q: ${pair.q}`, async () => {
      const res = await fetch("http://localhost:3000/api/docs/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: pair.q }),
      });
      expect(res.status).toBe(200);
      const txt = await res.text();
      const answerFrames = [...txt.matchAll(/data: (\{[^}]+"t":[^}]+\})/g)].map((m) => JSON.parse(m[1]).t);
      const answer = answerFrames.join("");
      for (const must of pair.mustInclude) {
        expect(answer.toLowerCase()).toContain(must.toLowerCase());
      }
    }, 30_000);
  }
});
```

- [ ] **Step 3: Run against a live Ollama**

```bash
OLLAMA_BASE_URL=https://gambchamp-ollama.fly.dev \
OLLAMA_AUTH_TOKEN=<token> \
RUN_EVAL=1 \
pnpm dev &  # serve from a real dev server
RUN_EVAL=1 pnpm vitest run tests/eval/docs-qa-eval.test.ts
```

Aim: 18/20 pass on first run. Iterate on system prompt / retrieval k / boost factor if accuracy is below target. Commit only the harness; do not gate CI on live Ollama.

- [ ] **Step 4: Add optional CI job (manual trigger)**

In the GitHub workflows, add a `workflow_dispatch`-only job that runs the eval — not on every PR.

- [ ] **Step 5: Commit**

```bash
git add crm-node/tests/eval
git commit -m "test(docs): grounded-QA eval harness (20 known-answer pairs)"
```

---

### Task 10: Operator/runbook pages

**Files:**
- Create: `crm-node/docs/runbooks/docs-qa-oncall.md`

- [ ] **Step 1: Write runbook**

```markdown
# Docs Q&A — oncall runbook

## Surfaces
- Widget on every `/docs/*` page.
- Full chat at `/docs/ai`.

## Dependencies
- **Ollama GPU server** — see `docs/runbooks/ollama-ops.md`.
- **Postgres** — `DocChunk` and `DocAskEvent` tables.
- **Redis** — rate limiter bucket `docs:ask:<ip>`.

## Failure modes

| Symptom                                              | Likely cause                             | Fix |
|:-----------------------------------------------------|:-----------------------------------------|:----|
| Every answer says "I don't have enough context"      | `DocChunk` table empty / indexer stale   | Run `pnpm docs:index` locally or trigger `docs-reindex` job manually. |
| 500 from `/api/docs/ask`                             | Ollama down / OLLAMA_BASE_URL wrong      | Check `fly logs -a gambchamp-ollama`. If GPU OOM → `fly restart`. |
| 401 from Ollama                                      | Token drift between apps                 | Re-sync `OLLAMA_AUTH_TOKEN` between `gambchamp-ollama` and `crm-node`. |
| Answers are slow (>15 s)                             | Cold model / multiple concurrent asks    | Check `OLLAMA_NUM_PARALLEL` and GPU utilization. Raise parallel to 8 if VRAM allows. |
| Off-policy answers (invents facts)                   | System-prompt regression                 | Pin prior `DOCS_LLM_SYSTEM_PROMPT_VERSION`. Compare with eval set. |

## Telemetry queries

Recent refusal rate:
```sql
SELECT date_trunc('hour', "createdAt") AS hr, COUNT(*) FILTER (WHERE refused) AS refused, COUNT(*) AS total
FROM "DocAskEvent"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY 1 ORDER BY 1 DESC;
```

P95 latency (ms):
```sql
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS p95
FROM "DocAskEvent" WHERE "createdAt" > NOW() - INTERVAL '24 hours';
```
```

- [ ] **Step 2: Commit**

```bash
git add crm-node/docs/runbooks/docs-qa-oncall.md
git commit -m "docs(runbook): docs Q&A oncall + telemetry queries"
```

---

### Task 11: CHANGELOG + READINESS + full suite

- [ ] **Step 1: CHANGELOG**

```markdown
## Unreleased — Local-LLM Q&A over docs

- **Qwen3-8B RAG assistant.** Fly GPU machine `gambchamp-ollama` serves `qwen3:8b-instruct-q5_K_M` + `bge-m3` behind a shared-secret Caddy proxy. The main app talks to it via a streaming client (`src/server/docs/ollama-chat.ts`).
- **Grounded SSE endpoint.** `POST /api/docs/ask` retrieves 8 chunks (hybrid), builds a system prompt enforcing citations + refusal, streams tokens + citations via SSE. Rate-limited 10/min/IP.
- **UI.** Floating `<ChatWidget>` on every `/docs/*` page (Alt+K), full chat at `/docs/ai`.
- **Telemetry.** `DocAskEvent` persists question, answer, citations, latency, refusal, prompt/model version.
- **Eval.** 20-pair QA harness under `tests/eval/docs-qa-eval.test.ts`, gated by `RUN_EVAL=1`.
- **New env vars:** `OLLAMA_AUTH_TOKEN`, `DOCS_LLM_MODEL`, `DOCS_LLM_MAX_TOKENS`, `DOCS_LLM_TEMPERATURE`, `DOCS_LLM_SYSTEM_PROMPT_VERSION`.
```

- [ ] **Step 2: READINESS**

```markdown
- [x] Docs local-LLM Q&A (Qwen3-8B + RAG + widget + full chat + eval set) — #2026-04-22-docs-06
```

- [ ] **Step 3: Green lights**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm vitest run tests/unit/docs tests/integration/docs tests/e2e/docs*
```
Expected: all green. Eval intentionally skipped without `RUN_EVAL=1`.

- [ ] **Step 4: Commit**

```bash
git add crm-node/CHANGELOG.md crm-node/docs/superpowers/READINESS_CHECKLIST.md
git commit -m "docs: record local-LLM Q&A shipping"
```

---

### Task 12: Self-review

- [ ] **Step 1: Spec coverage**

Fly GPU machine ✅ · Auth proxy ✅ · Env vars ✅ · Streaming chat client ✅ · RAG prompt + context ✅ · SSE route ✅ · Client hook ✅ · Widget ✅ · Full chat page ✅ · Telemetry model ✅ · Rate limit ✅ · Refusal handling ✅ · Citations UI ✅ · Eval set ✅ · Runbook ✅.

- [ ] **Step 2: Placeholder scan**

No TODOs. Every step has concrete code or commands.

- [ ] **Step 3: Type consistency**

`SearchHit` from plan #4 reused by `rag.ts`. `Citation` shape on the wire matches `useAskStream` type. `DocChunk.audience` values match the `audiences` enum everywhere.

- [ ] **Step 4: Cross-plan smoke**

Run a full end-to-end manual test:
1. `pnpm docs:regen` → `_deep/` populated.
2. `pnpm docs:index` → chunks in DB.
3. Open `/docs/ai` → ask "how do I push a bulk batch safely?" → answer streams with citations to `intake/how-to-send-bulk-leads` + `intake/_deep/rest-surface`.
4. Stop Ollama → ask again → UI shows error banner, DocAskEvent rows stop.

- [ ] **Step 5: Hand off**

Print: "Plan #6 complete. Docs subsite v1 is feature-complete: structure (#1), skeleton (#2), content (#3), search (#4), API reference (#5), AI Q&A (#6). v1.1 backlog: auth-gated runbooks area, drive content into the remaining 14 blocks, add Ollama regression eval to CI."
