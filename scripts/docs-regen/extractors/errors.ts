import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";
import type { BlockId, Section } from "../types";

// Matches multi-line TRPCError: new TRPCError({ code: '...', message: '...' ...})
// Uses the `s` (dotAll) flag so \s* spans newlines
const TRPC_ERROR_RE =
  /new\s+TRPCError\s*\(\s*\{[^}]*?code:\s*['"]([^'"]+)['"][^}]*?message:\s*['"]([^'"]+)['"][^}]*?\}/gs;
const PLAIN_ERROR_RE = /throw\s+new\s+Error\s*\(\s*['"`]([^'"`]+)['"`]/g;

export interface ErrorsExtractOpts {
  srcDir: string;
  cwd?: string;
}

type OutKey = BlockId | "__unassigned__";

function execAll(re: RegExp, src: string): RegExpExecArray[] {
  re.lastIndex = 0;
  const results: RegExpExecArray[] = [];
  let m = re.exec(src);
  while (m !== null) {
    results.push(m);
    m = re.exec(src);
  }
  return results;
}

export async function extractErrors(opts: ErrorsExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg(`${opts.srcDir}/**/*.ts`, { cwd, absolute: true });

  const out = new Map<OutKey, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  for (const file of files) {
    const src = await readFile(file, "utf8");
    const rel = file.slice(cwd.length + 1);
    const block: OutKey = resolveBlock({ kind: "server-path", name: rel }) ?? "__unassigned__";

    for (const m of execAll(TRPC_ERROR_RE, src)) {
      const line = src.slice(0, m.index).split("\n").length;
      out.get(block)!.push({
        source: "errors",
        heading: m[2],
        anchor: `err-${m[2]}`.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
        body: `TRPCError code=\`${m[1]}\` message=\`${m[2]}\` at \`${rel}:${line}\`.`,
      });
    }

    for (const m of execAll(PLAIN_ERROR_RE, src)) {
      const line = src.slice(0, m.index).split("\n").length;
      out.get(block)!.push({
        source: "errors",
        heading: `Error: ${m[1]}`,
        anchor: `err-plain-${m[1]}`.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
        body: `Plain Error: \`${m[1]}\` at \`${rel}:${line}\`.`,
      });
    }
  }

  // Return without __unassigned__ so callers get Map<BlockId, Section[]>
  const result = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) result.set(b.id, out.get(b.id) ?? []);
  return result;
}
