import { readFile } from "node:fs/promises";
import fg from "fast-glob";

const LINK_RE = /\]\((\/docs\/[^)#\s]+)(?:#[^)\s]+)?\)/g;

export async function checkLinks(cwd = process.cwd()): Promise<string[]> {
  const files = await fg("content/docs/**/*.{md,mdx}", { cwd, absolute: true });
  const allSlugs = new Set<string>();
  for (const f of files) {
    const slug =
      "/docs/" +
      f
        .slice(cwd.length + 1)
        .replace(/^content\/docs\//, "")
        .replace(/\.(md|mdx)$/, "");
    allSlugs.add(slug);
    // Also register the directory form (for slugOverride'd pages like /docs/intake)
    const dir = slug.replace(/\/index$/, "");
    allSlugs.add(dir);
  }
  const broken: string[] = [];
  for (const f of files) {
    const src = await readFile(f, "utf8");
    for (const m of src.matchAll(LINK_RE)) {
      const target = m[1].replace(/\/$/, "");
      if (!allSlugs.has(target) && !allSlugs.has(target + "/index")) {
        // ALSO accept any path that starts with /docs/<known-block-id>/ (for slugOverride)
        const seg = target.split("/").slice(0, 3).join("/"); // "/docs/<block>"
        if (allSlugs.has(seg)) continue;
        broken.push(`${f.slice(cwd.length + 1)}: ${target}`);
      }
    }
  }
  return broken;
}

if (require.main === module) {
  checkLinks().then((bad) => {
    if (bad.length) {
      console.error(`[docs-links] ${bad.length} broken:`);
      for (const b of bad) console.error("  " + b);
      process.exit(1);
    } else {
      console.log("[docs-links] OK");
    }
  });
}
