import type { RegenManifest, RegenOptions } from "./types";

export async function runDocsRegen(opts: RegenOptions): Promise<RegenManifest> {
  return {
    generatedAt: new Date().toISOString(),
    blocks: [],
    sourceCommit: null,
  };
}

if (require.main === module) {
  const mode = (process.argv.includes("--check") ? "check" :
    process.argv.includes("--write") ? "write" : "dry") as RegenOptions["mode"];
  runDocsRegen({ mode, cwd: process.cwd() }).then((m) => {
    console.log(`[docs-regen] mode=${mode} blocks=${m.blocks.length}`);
  });
}
