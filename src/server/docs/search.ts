import { prisma } from "@/server/db";
import { embed } from "./embeddings";

export interface SearchHit {
  id: string;
  slug: string;
  audience: "human" | "ai-deep";
  block: string;
  kind: string;
  title: string;
  snippet: string;
  anchor: string | null;
  score: number;
}

export interface SearchOpts {
  q: string;
  audiences: Array<"human" | "ai-deep">;
  k?: number;
  boostAiDeep?: boolean;
}

const RRF_K = 60;

export async function searchDocs(opts: SearchOpts): Promise<SearchHit[]> {
  const k = opts.k ?? 10;
  const kWide = Math.max(k * 3, 30);
  const aud = opts.audiences;

  const qVec = await embed(opts.q);
  const vecLit = `[${qVec.join(",")}]`;

  const dense: Array<{ id: string; rank: number | bigint }> = await prisma.$queryRawUnsafe(
    `
    SELECT id, row_number() OVER (ORDER BY embedding <=> $1::vector ASC) AS rank
    FROM "DocChunk"
    WHERE audience = ANY($2::text[])
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $3
    `,
    vecLit,
    aud,
    kWide,
  );

  const sparse: Array<{ id: string; rank: number | bigint }> = await prisma.$queryRawUnsafe(
    `
    SELECT id, row_number() OVER (ORDER BY ts_rank(tsv, plainto_tsquery('english', $1)) DESC) AS rank
    FROM "DocChunk"
    WHERE audience = ANY($2::text[])
      AND tsv @@ plainto_tsquery('english', $1)
    ORDER BY ts_rank(tsv, plainto_tsquery('english', $1)) DESC
    LIMIT $3
    `,
    opts.q,
    aud,
    kWide,
  );

  const scores = new Map<string, number>();
  for (const r of dense) {
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (RRF_K + Number(r.rank)));
  }
  for (const r of sparse) {
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (RRF_K + Number(r.rank)));
  }

  const topIds = [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, k * 2)
    .map(([id]) => id);

  if (!topIds.length) return [];

  const rows: Array<{
    id: string;
    slug: string;
    audience: string;
    block: string;
    kind: string;
    title: string;
    body: string;
    anchor: string | null;
    snippet: string;
  }> = await prisma.$queryRawUnsafe(
    `
    SELECT id, slug, audience, block, kind, title, body, anchor,
           ts_headline('english', body, plainto_tsquery('english', $1),
                       'MaxWords=24, MinWords=12, ShortWord=3') AS snippet
    FROM "DocChunk"
    WHERE id = ANY($2::text[])
    `,
    opts.q,
    topIds,
  );

  const BOOST = opts.boostAiDeep ? 1.15 : 1.0;

  const hits: SearchHit[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    audience: r.audience as "human" | "ai-deep",
    block: r.block,
    kind: r.kind,
    title: r.title,
    snippet: r.snippet || r.body.slice(0, 200),
    anchor: r.anchor ?? null,
    score: (scores.get(r.id) ?? 0) * (r.audience === "ai-deep" ? BOOST : 1.0),
  }));

  return hits.sort((a, b) => b.score - a.score).slice(0, k);
}
