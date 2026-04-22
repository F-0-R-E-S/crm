import { prisma } from "@/server/db";
import { streamChat } from "@/server/docs/ollama-chat";
import { buildRagPrompt } from "@/server/docs/rag";
import type { SearchHit } from "@/server/docs/search";
import { searchDocs } from "@/server/docs/search";
import { rateLimit } from "@/server/ratelimit";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  question: z.string().min(3).max(1000),
  priorTurns: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(10)
    .optional(),
});

export async function POST(req: NextRequest) {
  let parsed: ReturnType<typeof BodySchema.safeParse>;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), { status: 400 });
  }
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "bad_request", issues: parsed.error.issues }), {
      status: 400,
    });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const rlKey = `docs:ask:${ip}`;
  const allowed = await rateLimit({ key: rlKey, limit: 10, windowSeconds: 60 }).catch(() => true);
  if (allowed === false) {
    return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 });
  }

  const { question, priorTurns } = parsed.data;
  const hits: SearchHit[] = await searchDocs({
    q: question,
    audiences: ["human", "ai-deep"],
    k: 8,
    boostAiDeep: true,
  });
  const refused = hits.length === 0;
  // RagHit is a superset of SearchHit minus `kind` field — cast via unknown
  const messages = buildRagPrompt({
    question,
    hits: hits as unknown as Parameters<typeof buildRagPrompt>[0]["hits"],
    priorTurns,
  });

  const encoder = new TextEncoder();
  const t0 = Date.now();
  const modelName = process.env.DOCS_LLM_MODEL ?? "qwen3:8b-instruct-q5_K_M";
  const promptVer = process.env.DOCS_LLM_SYSTEM_PROMPT_VERSION ?? "v1";
  let captured = "";

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: citations\ndata: ${JSON.stringify(
            hits.map((h) => ({
              id: h.id,
              slug: h.slug,
              title: h.title,
              audience: h.audience,
              anchor: h.anchor,
            })),
          )}\n\n`,
        ),
      );

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
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: (e as Error).message })}\n\n`,
            ),
          );
        }
      }
      controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
      controller.close();

      // Fire-and-forget telemetry write (don't block stream close on DB failures).
      prisma.docAskEvent
        .create({
          data: {
            userId: null,
            tenantId: null,
            question,
            answer: captured,
            hitsJson: hits.map((h) => ({
              chunkId: h.id,
              slug: h.slug,
              audience: h.audience,
              score: h.score,
            })),
            latencyMs: Date.now() - t0,
            refused,
            promptVer,
            modelName,
          },
        })
        .catch(() => {
          /* swallow */
        });
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
