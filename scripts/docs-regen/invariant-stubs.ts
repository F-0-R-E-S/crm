import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { BLOCK_CATALOG } from "./block-catalog";

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function scaffoldInvariantStubs(cwd = process.cwd()): Promise<string[]> {
  const created: string[] = [];
  for (const b of BLOCK_CATALOG) {
    const path = resolve(cwd, `content/docs/${b.id}/_deep/invariants.md`);
    if (await exists(path)) continue;
    await mkdir(dirname(path), { recursive: true });
    const body = [
      "---",
      "audience: ai-deep",
      `block: ${b.id}`,
      "source: hand",
      "kind: invariants",
      `title: "Invariants — ${b.title}"`,
      "---",
      "",
      `# Invariants — ${b.title}`,
      "",
      "> Non-obvious rules, edge cases, and facts that are NOT derivable from code.",
      "> Auto-gen sources cover structure; this file covers **why it must be that way**.",
      "",
      "<!-- Add one H2 per invariant. Example:",
      "",
      "## Fraud score is never recomputed after intake",
      "",
      "- **Rule:** once `Lead.fraudScore` is written, no code path mutates it.",
      "- **Why:** reprocessing would break the hash-chain of `LeadEvent.FRAUD_SCORED`.",
      "- **Failure mode if violated:** audit-chain verification fails on that lead.",
      "-->",
      "",
    ].join("\n");
    await writeFile(path, body, "utf8");
    created.push(path);
  }
  return created;
}

if (require.main === module) {
  scaffoldInvariantStubs().then((x) => console.log(`[invariants] scaffolded ${x.length} files`));
}
