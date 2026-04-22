import { createHash } from "node:crypto";
import { loadDeepOnly, loadDocsTree } from "@/lib/docs-content";
import { prisma } from "@/server/db";
import { type Chunk, chunkMarkdown } from "./chunker";
import { EMBEDDING_DIM, embedBatch } from "./embeddings";
import { openapiChunks } from "./openapi-indexer";

export interface IndexManifest {
  chunkCount: number;
  embeddedCount: number;
  skippedUnchanged: number;
  generatedAt: string;
}

export async function indexDocs(opts: { root: string; cwd?: string }): Promise<IndexManifest> {
  const cwd = opts.cwd ?? process.cwd();

  const humanTree = await loadDocsTree({ ...opts, cwd });
  const deepPages = await loadDeepOnly({ ...opts, cwd });
  const pages = [...humanTree.flatMap((n) => n.pages), ...deepPages];

  const allChunks: Chunk[] = [];
  for (const p of pages) {
    allChunks.push(
      ...chunkMarkdown({
        text: p.rawBody,
        audience: p.audience,
        slug: p.slug,
        block: p.frontmatter.block,
        kind: p.frontmatter.kind ?? (p.audience === "human" ? "overview" : "unknown"),
        title: p.frontmatter.title,
      }),
    );
  }

  // Append OpenAPI chunks (one per path × method).
  try {
    const openapi = await openapiChunks({ openapiYamlPath: "docs/api/v1/openapi.yaml", cwd });
    allChunks.push(...openapi);
  } catch (e) {
    // OpenAPI file may be missing in some CI contexts; log and proceed.
    console.warn("[docs-index] openapi not available:", (e as Error).message);
  }

  const wantedIds = allChunks.map((c) => c.id);

  const existing: Array<{ id: string; sourceHash: string }> =
    wantedIds.length > 0
      ? await prisma.$queryRawUnsafe(
          `SELECT id, "sourceHash" FROM "DocChunk" WHERE id = ANY($1::text[])`,
          wantedIds,
        )
      : [];

  const existingById = new Map(existing.map((e) => [e.id, e.sourceHash]));

  const toEmbed: Chunk[] = [];
  for (const c of allChunks) {
    const h = sourceHashOf(c);
    if (existingById.get(c.id) !== h) toEmbed.push(c);
  }

  let embeddedCount = 0;
  if (toEmbed.length) {
    const vecs = await embedBatch(toEmbed.map((c) => `${c.title}\n\n${c.body}`));
    embeddedCount = vecs.length;

    for (let i = 0; i < toEmbed.length; i++) {
      const c = toEmbed[i];
      const vec = vecs[i];
      if (vec.length !== EMBEDDING_DIM) {
        throw new Error(`bad embedding dim: expected ${EMBEDDING_DIM}, got ${vec.length}`);
      }
      const vecLit = `[${vec.join(",")}]`;
      const hash = sourceHashOf(c);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocChunk" (id, slug, audience, block, kind, title, body, anchor, "sourceHash", embedding, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, NOW())
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           audience = EXCLUDED.audience,
           block = EXCLUDED.block,
           kind = EXCLUDED.kind,
           title = EXCLUDED.title,
           body = EXCLUDED.body,
           anchor = EXCLUDED.anchor,
           "sourceHash" = EXCLUDED."sourceHash",
           embedding = EXCLUDED.embedding`,
        c.id,
        c.slug,
        c.audience,
        c.block,
        c.kind,
        c.title,
        c.body,
        c.anchor ?? null,
        hash,
        vecLit,
      );
    }
  }

  // Delete rows whose chunk id no longer exists.
  if (wantedIds.length > 0) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "DocChunk" WHERE id <> ALL($1::text[])`,
      wantedIds,
    );
  } else {
    // No chunks at all — wipe everything
    await prisma.$executeRaw`TRUNCATE "DocChunk"`;
  }

  return {
    chunkCount: allChunks.length,
    embeddedCount,
    skippedUnchanged: allChunks.length - embeddedCount,
    generatedAt: new Date().toISOString(),
  };
}

function sourceHashOf(c: Chunk): string {
  return createHash("sha256")
    .update(`${c.title}\n${c.body}`)
    .digest("hex")
    .slice(0, 24);
}
