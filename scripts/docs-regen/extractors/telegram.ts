import fg from "fast-glob";
import { Project } from "ts-morph";
import { BLOCK_CATALOG } from "../block-catalog";
import type { BlockId, Section } from "../types";

export interface TelegramExtractOpts {
  catalogPath: string;
  templatesDir: string;
  cwd?: string;
}

export async function extractTelegram(opts: TelegramExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const project = new Project({ tsConfigFilePath: `${cwd}/tsconfig.json` });
  const sf = project.addSourceFileAtPath(`${cwd}/${opts.catalogPath}`);

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);

  const text = sf.getFullText();
  const literals = Array.from(text.matchAll(/['"]([A-Z_]{3,})['"]/g))
    .map((m) => m[1])
    .filter((s) => /^[A-Z][A-Z_]+$/.test(s));
  const unique = [...new Set(literals)];

  const templateFiles = await fg(`${opts.templatesDir}/*.ts`, { cwd, absolute: true });
  const templateBySlug = new Map<string, string>();
  for (const f of templateFiles) {
    const slug = f.split("/").pop()!.replace(/\.ts$/, "");
    templateBySlug.set(slug, f.slice(cwd.length + 1));
  }

  for (const ev of unique) {
    const slug = ev.toLowerCase().replace(/_/g, "-");
    const templatePath = templateBySlug.get(slug) ?? `(no template matched slug "${slug}")`;
    out.get("telegram-bot")!.push({
      source: "telegram",
      heading: ev,
      anchor: `tg-${slug}`,
      body:
        `Telegram event \`${ev}\`.\n\nTemplate: \`${templatePath}\`.\n\n` +
        `Defined in \`${opts.catalogPath}\`. Emit site: grep the codebase for \`emitTelegramEvent("${ev}"\`.`,
    });
  }
  return out;
}
