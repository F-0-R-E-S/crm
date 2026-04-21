import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fg from "fast-glob";
import yaml from "yaml";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";
import type { BlockId, Section } from "../types";

export interface RestExtractOpts {
  appApiDir: string;
  openapiYamlPath?: string;
  cwd?: string;
}

const VERBS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export async function extractRest(opts: RestExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg(`${opts.appApiDir}/**/route.ts`, { cwd, absolute: true });

  const openapi = opts.openapiYamlPath
    ? (yaml.parse(await readFile(resolve(cwd, opts.openapiYamlPath), "utf8")) as Record<
        string,
        unknown
      >)
    : null;

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  for (const file of files) {
    const src = await readFile(file, "utf8");
    const verbs = VERBS.filter(
      (v) =>
        new RegExp(`export\\s+async\\s+function\\s+${v}\\s*\\(`).test(src) ||
        new RegExp(`export\\s+const\\s+${v}\\s*=`).test(src),
    );
    if (!verbs.length) continue;
    const path = appRouteToPath(file, cwd, opts.appApiDir);
    const block = resolveBlock({ kind: "rest-path", name: path }) ?? "__unassigned__";

    for (const verb of verbs) {
      const heading = `${verb} ${path}`;
      const openapiPaths = openapi
        ? // biome-ignore lint/suspicious/noExplicitAny: openapi yaml is untyped
          (openapi.paths as Record<string, Record<string, any>> | undefined)
        : undefined;
      const openapiOp = openapiPaths
        ? (openapiPaths[path]?.[verb.toLowerCase()] ??
          openapiPaths[path.replace(/\{([^}]+)\}/g, ":$1")]?.[verb.toLowerCase()])
        : undefined;

      const bodyParts: string[] = [];
      if (openapiOp?.summary) bodyParts.push(openapiOp.summary as string);
      if (openapiOp?.description) bodyParts.push(openapiOp.description as string);
      if (openapiOp?.requestBody) {
        bodyParts.push(`\n**Request body**\n\`\`\`yaml\n${yaml.stringify(openapiOp.requestBody)}\`\`\``);
      }
      if (openapiOp?.responses) {
        bodyParts.push(`\n**Responses**\n\`\`\`yaml\n${yaml.stringify(openapiOp.responses)}\`\`\``);
      }
      if (!bodyParts.length) bodyParts.push(`Handler: \`${relativeFile(file, cwd)}\``);

      out.get(block)!.push({
        source: "rest",
        heading,
        anchor: `rest-${verb.toLowerCase()}-${path.replace(/[^a-z0-9]/gi, "-")}`.toLowerCase(),
        body: bodyParts.join("\n\n"),
      });
    }
  }
  return out;
}

function relativeFile(abs: string, cwd: string): string {
  return abs.startsWith(cwd) ? abs.slice(cwd.length + 1) : abs;
}

function appRouteToPath(file: string, cwd: string, appApiDir: string): string {
  const rel = relativeFile(file, cwd);
  const withoutRoute = rel
    .replace(new RegExp(`^${appApiDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "/api")
    .replace(/\/route\.ts$/, "");
  return withoutRoute.replace(/\[([^\]]+)\]/g, "{$1}");
}
