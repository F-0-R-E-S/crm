import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDMMF } from "@prisma/internals";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";
import type { BlockId, Section } from "../types";

export interface PrismaExtractOpts {
  schemaPath: string;
  cwd?: string;
}

export async function extractPrisma(opts: PrismaExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const datamodel = await readFile(resolve(cwd, opts.schemaPath), "utf8");
  const dmmf = await getDMMF({ datamodel });

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  const usedEnums = new Set<string>();

  for (const model of dmmf.datamodel.models) {
    const block: BlockId =
      resolveBlock({ kind: "prisma-model", name: model.name }) ?? "__unassigned__";
    const lines: string[] = [];
    lines.push("Database-backed model. Source: `prisma/schema.prisma`.", "");
    for (const field of model.fields) {
      if (field.kind === "enum") usedEnums.add(field.type);
      const parts: string[] = [];
      parts.push(`\`${field.type}${field.isList ? "[]" : ""}${field.isRequired ? "" : "?"}\``);
      if (field.isId) parts.push("**id**");
      if (field.isUnique) parts.push("unique");
      if (field.hasDefaultValue) {
        const d = JSON.stringify(field.default);
        parts.push(`default=${d}`);
      }
      if (field.relationName) parts.push(`relation→${field.relationName}`);
      lines.push(`- **${field.name}** ${parts.join(" ")}`);
    }
    if (model.uniqueIndexes.length) {
      lines.push("", "**Unique indexes:**");
      for (const ui of model.uniqueIndexes) {
        lines.push(`- (${ui.fields.join(", ")})`);
      }
    }
    if (model.primaryKey) {
      lines.push("", `**Composite PK:** (${model.primaryKey.fields.join(", ")})`);
    }

    out.get(block)!.push({
      source: "prisma",
      heading: model.name,
      anchor: `db-${model.name.toLowerCase()}`,
      body: lines.join("\n"),
    });
  }

  for (const enumDef of dmmf.datamodel.enums) {
    if (!usedEnums.has(enumDef.name)) continue;
    let ownerBlock: BlockId = "__unassigned__";
    for (const model of dmmf.datamodel.models) {
      if (model.fields.some((f) => f.type === enumDef.name)) {
        ownerBlock = resolveBlock({ kind: "prisma-model", name: model.name }) ?? ownerBlock;
        break;
      }
    }
    const body = `Enum referenced by one or more models.\n\n${enumDef.values.map((v) => `- ${v.name}`).join("\n")}`;
    out.get(ownerBlock)!.push({
      source: "prisma",
      heading: `enum ${enumDef.name}`,
      anchor: `db-enum-${enumDef.name.toLowerCase()}`,
      body,
    });
  }

  return out;
}
