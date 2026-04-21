import fg from "fast-glob";
import { Project, SyntaxKind } from "ts-morph";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";
import type { BlockId, Section } from "../types";

const AUTH_BUILDER_TO_LEVEL: Record<string, string> = {
  publicProcedure: "public",
  protectedProcedure: "protected",
  adminProcedure: "admin",
  superAdminProcedure: "superAdmin",
};

export interface TrpcExtractOpts {
  routersDir: string;
  cwd?: string;
}

export async function extractTrpc(opts: TrpcExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg(`${opts.routersDir}/**/*.ts`, { cwd, absolute: true });

  const project = new Project({
    tsConfigFilePath: `${cwd}/tsconfig.json`,
    skipAddingFilesFromTsConfig: true,
  });
  for (const f of files) project.addSourceFileAtPathIfExists(f);

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  for (const sf of project.getSourceFiles()) {
    const routerName = routerNameFromFile(sf.getFilePath());
    if (!routerName) continue;
    // Skip _app.ts (the root appRouter aggregator)
    if (routerName === "_app") continue;

    const block = resolveBlock({ kind: "trpc-router", name: routerName }) ?? "__unassigned__";

    const routerCall = sf.getDescendantsOfKind(SyntaxKind.CallExpression).find((c) => {
      const expr = c.getExpression().getText();
      // Matches: createTRPCRouter(...), t.router(...), or plain router(...) imported from trpc
      return (
        expr === "createTRPCRouter" ||
        expr.endsWith(".createTRPCRouter") ||
        expr === "router" ||
        expr.endsWith(".router")
      );
    });
    if (!routerCall) continue;

    const arg0 = routerCall.getArguments()[0];
    if (!arg0 || !arg0.asKind(SyntaxKind.ObjectLiteralExpression)) continue;

    const routerObj = arg0.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    for (const prop of routerObj.getProperties()) {
      if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
      const propAssignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const procName = propAssignment.getName();
      const init = propAssignment.getInitializer();
      if (!init) continue;

      const chain = init.getText();

      // Determine auth level
      let authn = "unknown";
      for (const [builder, level] of Object.entries(AUTH_BUILDER_TO_LEVEL)) {
        if (chain.includes(builder)) {
          authn = level;
          break;
        }
      }

      // Determine procedure kind
      const kind = chain.includes(".mutation(")
        ? "mutation"
        : chain.includes(".query(")
          ? "query"
          : chain.includes(".subscription(")
            ? "subscription"
            : "unknown";

      // Extract input schema description — look for .input( ... )
      const inputText = extractInputText(chain);

      const body =
        `Procedure \`${routerName}.${procName}\` — authn: ${authn}, kind: ${kind}.\n\n` +
        `input: ${inputText}\n\n` +
        `Source: \`${relativePath(sf.getFilePath(), cwd)}\``;

      out.get(block)!.push({
        source: "trpc",
        heading: `${routerName}.${procName}`,
        anchor: `trpc-${routerName}-${procName}`.toLowerCase(),
        body,
      });
    }
  }

  return out;
}

/**
 * Extract a short description of the `.input(...)` call from the procedure chain text.
 * Returns "—" if no input call is found.
 */
function extractInputText(chain: string): string {
  // Find the position of .input( in the chain
  const inputIdx = chain.indexOf(".input(");
  if (inputIdx === -1) return "—";

  // Extract everything after .input(
  const afterInput = chain.slice(inputIdx + 7); // skip ".input("

  // Find the matching closing paren by tracking nesting depth
  let depth = 1;
  let i = 0;
  for (; i < afterInput.length; i++) {
    const ch = afterInput[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) break;
    }
  }

  const inputContent = afterInput.slice(0, i).trim();

  // Return a compact representation — for large schemas just take the first line or first 120 chars
  if (inputContent.length <= 120) return inputContent;

  // For complex schemas, show start + schema type hint
  const firstLine = inputContent.split("\n")[0]?.trim() ?? "";
  return firstLine.length > 0 ? `${firstLine}…` : `${inputContent.slice(0, 120)}…`;
}

function routerNameFromFile(fp: string): string | null {
  const m = fp.match(/\/routers\/([^/]+)\.ts$/);
  return m ? m[1] : null;
}

function relativePath(abs: string, cwd: string): string {
  return abs.startsWith(cwd) ? abs.slice(cwd.length + 1) : abs;
}
