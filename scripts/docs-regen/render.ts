import type { Section } from "./types";

export function renderDeepFile(opts: {
  block: string;
  source: Section["source"];
  sections: Section[];
}): string {
  const title = sourceTitle(opts.source);
  const frontmatter = [
    "---",
    "audience: ai-deep",
    `block: ${opts.block}`,
    "source: auto-gen",
    `kind: ${opts.source}`,
    `title: "${title} — ${opts.block}"`,
    "---",
    "",
  ].join("\n");

  const body = opts.sections
    .sort((a, b) => a.heading.localeCompare(b.heading))
    .map((s) => `# ${s.heading}\n<a id="${s.anchor}"></a>\n\n${s.body.trim()}\n`)
    .join("\n---\n\n");

  return `${frontmatter}${body}\n`;
}

function sourceTitle(src: Section["source"]): string {
  switch (src) {
    case "prisma":
      return "DB Schema";
    case "trpc":
      return "tRPC Surface";
    case "rest":
      return "REST Surface";
    case "env":
      return "Environment Variables";
    case "errors":
      return "Error Catalog";
    case "telegram":
      return "Telegram Events";
    case "jobs":
      return "Jobs";
    case "invariants":
      return "Invariants";
  }
}
