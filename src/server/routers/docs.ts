import { z } from "zod";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/ratelimit";
import { publicProcedure, router } from "@/server/trpc";
import { searchDocs } from "@/server/docs/search";

const AudienceEnum = z.enum(["human", "ai-deep"]);

export const docsRouter = router({
  search: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(200),
        k: z.number().int().min(1).max(20).default(10),
        audiences: z.array(AudienceEnum).min(1).default(["human"]),
        boostAiDeep: z.boolean().default(false),
        mode: z.enum(["cmdk", "ask-ai"]).default("cmdk"),
      }),
    )
    .query(async ({ input, ctx }) => {
      const key = `docs:search:${ctx.session?.user?.id ?? ctx.tenantId ?? "anon"}`;
      const allowed = await rateLimit({ key, limit: 20, windowSeconds: 60 });
      if (!allowed) {
        throw new Error("rate_limited");
      }

      const t0 = Date.now();
      const hits = await searchDocs({
        q: input.q,
        k: input.k,
        audiences: input.audiences,
        boostAiDeep: input.boostAiDeep,
      });
      const latencyMs = Date.now() - t0;

      await prisma.docSearchEvent.create({
        data: {
          userId: ctx.session?.user?.id ?? null,
          tenantId: ctx.tenantId ?? null,
          query: input.q,
          mode: input.mode,
          topKJson: hits.map((h) => ({ chunkId: h.id, score: h.score })),
          latencyMs,
        },
      });

      return hits;
    }),
});
