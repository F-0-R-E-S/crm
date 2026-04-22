import { indexDocs } from "@/server/docs/indexer";

export const JOB_NAME = "docs-reindex";

export async function handleDocsReindex(): Promise<void> {
  const manifest = await indexDocs({ root: "content/docs" });
  console.log(
    `[${JOB_NAME}] ${manifest.chunkCount} chunks, ${manifest.embeddedCount} embedded, ${manifest.skippedUnchanged} skipped`,
  );
}
