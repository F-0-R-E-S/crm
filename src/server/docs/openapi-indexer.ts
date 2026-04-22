import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolveBlock } from "../../../scripts/docs-regen/block-catalog";
import type { Chunk } from "./chunker";
import yaml from "yaml";

export async function openapiChunks(opts: {
  openapiYamlPath: string;
  cwd?: string;
}): Promise<Chunk[]> {
  const cwd = opts.cwd ?? process.cwd();
  const raw = await readFile(`${cwd}/${opts.openapiYamlPath}`, "utf8");
  const spec: any = yaml.parse(raw);
  const chunks: Chunk[] = [];

  for (const [path, ops] of Object.entries<any>(spec.paths ?? {})) {
    for (const method of Object.keys(ops)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
      const op = ops[method];
      const title = `${method.toUpperCase()} ${path}`;
      const body = [
        op.summary ?? "",
        op.description ?? "",
        "",
        "**Request body:**",
        yaml.stringify(op.requestBody ?? { note: "no body" }),
        "",
        "**Responses:**",
        yaml.stringify(op.responses ?? {}),
      ].join("\n");
      const anchor = `operation-${(op.operationId ?? `${method}${path.replace(/[^a-z0-9]/gi, "-")}`).toLowerCase()}`;
      const block = resolveBlock({ kind: "rest-path", name: path }) ?? "api-docs";
      const id = createHash("sha256")
        .update(`openapi::${title}`)
        .digest("hex")
        .slice(0, 16);
      chunks.push({
        id,
        slug: "api",
        audience: "ai-deep",
        block,
        kind: "openapi",
        title,
        body,
        anchor,
        tokens: Math.ceil(body.length / 4),
      });
    }
  }
  return chunks;
}
