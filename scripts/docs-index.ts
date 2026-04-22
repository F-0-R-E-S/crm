import { indexDocs } from "../src/server/docs/indexer";

indexDocs({ root: "content/docs" })
  .then((m) => {
    console.log(
      `[docs:index] ${m.chunkCount} chunks, ${m.embeddedCount} embedded, ${m.skippedUnchanged} skipped`,
    );
  })
  .catch((e) => {
    console.error("[docs:index] failed:", e);
    process.exit(1);
  });
