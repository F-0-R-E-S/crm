import { BLOCK_CATALOG, resolveBlock } from "../docs-regen/block-catalog";

const IGNORE_RE = [
  /^tests\//,
  /^crm-node\/tests\//,
  /\.test\.(ts|tsx|mts)$/,
  /^\.github\//,
  /^content\/docs\/.+\/_deep\//,
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /\.md$/,
  /\.mdx$/,
];

export interface ImpactInput {
  changedPaths: string[];
  prismaChangedModels?: string[];
}

export interface ImpactResult {
  affectedBlocks: string[];
  codeChangedByBlock: Record<string, string[]>;
  humanDocsChangedByBlock: Record<string, string[]>;
}

/**
 * Resolve the best-matching block for a server-side file path.
 * Prefers the most specific (longest) serverDir prefix match so that
 * a file like `src/server/intake/fraud-score.ts` resolves to the
 * `fraud-score` block rather than the broader `intake` block.
 */
function resolveBlockByServerPath(rel: string): string | null {
  let bestBlock: string | null = null;
  let bestLen = -1;

  for (const b of BLOCK_CATALOG) {
    for (const dir of b.serverDirs) {
      if (rel.startsWith(dir) && dir.length > bestLen) {
        bestLen = dir.length;
        bestBlock = b.id;
      }
    }
  }

  return bestBlock;
}

export function analyzeImpact(input: ImpactInput): ImpactResult {
  const codeByBlock: Record<string, string[]> = {};
  const docsByBlock: Record<string, string[]> = {};

  for (const rel of input.changedPaths) {
    const docMatch = rel.match(/^content\/docs\/([^/]+)\/(?!_deep\/)[^/]+\.mdx?$/);
    if (docMatch) {
      const [, block] = docMatch;
      if (!docsByBlock[block]) docsByBlock[block] = [];
      docsByBlock[block].push(rel);
      continue;
    }
    if (IGNORE_RE.some((re) => re.test(rel))) continue;

    const block =
      resolveBlockByServerPath(rel) ??
      resolveBlock({ kind: "rest-path", name: pathToRestRoute(rel) });
    if (block) {
      if (!codeByBlock[block]) codeByBlock[block] = [];
      codeByBlock[block].push(rel);
    }
  }

  if (input.prismaChangedModels?.length) {
    for (const model of input.prismaChangedModels) {
      const block = resolveBlock({ kind: "prisma-model", name: model });
      if (block) {
        if (!codeByBlock[block]) codeByBlock[block] = [];
        codeByBlock[block].push(`prisma:${model}`);
      }
    }
  }

  const affected = new Set([...Object.keys(codeByBlock), ...Object.keys(docsByBlock)]);
  return {
    affectedBlocks: [...affected],
    codeChangedByBlock: codeByBlock,
    humanDocsChangedByBlock: docsByBlock,
  };
}

function pathToRestRoute(rel: string): string {
  const m = rel.match(/^src\/app(\/api\/[^/]+(?:\/[^/]+)*?)\/route\.ts$/);
  if (!m) return "";
  return m[1].replace(/\[([^\]]+)\]/g, "{$1}");
}
