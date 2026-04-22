import { createHash } from "node:crypto";

const HUMAN_TARGET = 500;
const HUMAN_MAX = 700;
const AI_DEEP_TARGET = 150;
const AI_DEEP_MAX = 250;

export interface ChunkInput {
  text: string;
  audience: "human" | "ai-deep";
  slug: string;
  block: string;
  kind: string;
  title: string;
}
export interface Chunk {
  id: string;
  slug: string;
  audience: "human" | "ai-deep";
  block: string;
  kind: string;
  title: string;
  body: string;
  anchor?: string;
  tokens: number;
}

export function chunkMarkdown(input: ChunkInput): Chunk[] {
  const depthRe = input.audience === "ai-deep" ? /^(#{1,2})\s+(.+)$/m : /^(#{2,3})\s+(.+)$/m;
  const target = input.audience === "ai-deep" ? AI_DEEP_TARGET : HUMAN_TARGET;
  const max = input.audience === "ai-deep" ? AI_DEEP_MAX : HUMAN_MAX;

  const rawSections = splitByHeadings(input.text, depthRe);
  const out: Chunk[] = [];

  for (const sec of rawSections) {
    const tokens = countTokens(sec.body);
    if (tokens <= max) {
      out.push(makeChunk(input, sec));
      continue;
    }
    // Paragraph-level sub-split.
    const paras = sec.body.split(/\n{2,}/);
    let buf: string[] = [];
    let bufTokens = 0;
    for (const p of paras) {
      const pt = countTokens(p);
      if (bufTokens + pt > target && buf.length) {
        out.push(makeChunk(input, { ...sec, body: buf.join("\n\n") }));
        buf = [p];
        bufTokens = pt;
      } else {
        buf.push(p);
        bufTokens += pt;
      }
    }
    if (buf.length) out.push(makeChunk(input, { ...sec, body: buf.join("\n\n") }));
  }
  return out;
}

function splitByHeadings(
  text: string,
  depthRe: RegExp,
): Array<{ title: string; body: string; anchor?: string }> {
  const headingRe = depthRe.source.includes("{2,3}") ? /^(#{2,3})\s+(.+)$/ : /^(#{1,2})\s+(.+)$/;
  const lines = text.split("\n");
  const sections: Array<{ title: string; body: string; anchor?: string }> = [];
  let cur = { title: "_intro_", body: "", anchor: undefined as string | undefined };
  for (const ln of lines) {
    const m = ln.match(headingRe);
    if (m) {
      if (cur.body.trim() || cur.title !== "_intro_") sections.push(cur);
      cur = { title: m[2].trim(), body: "", anchor: undefined };
    } else {
      const anchorMatch = ln.match(/<a\s+id=["']([^"']+)["']/);
      if (anchorMatch && !cur.anchor) cur.anchor = anchorMatch[1];
      cur.body += `${ln}\n`;
    }
  }
  if (cur.body.trim() || cur.title !== "_intro_") sections.push(cur);
  return sections;
}

function makeChunk(
  input: ChunkInput,
  sec: { title: string; body: string; anchor?: string },
): Chunk {
  const body = sec.body.trim();
  const tokens = countTokens(body);
  const id = createHash("sha256")
    .update(`${input.slug}::${sec.anchor ?? sec.title}::${body}`)
    .digest("hex")
    .slice(0, 16);
  return {
    id,
    slug: input.slug,
    audience: input.audience,
    block: input.block,
    kind: input.kind,
    title: sec.title === "_intro_" ? input.title : sec.title,
    body,
    anchor: sec.anchor,
    tokens,
  };
}

// Fast char-based token approximation. Upgrade to tiktoken if accuracy matters
// (install `tiktoken` and import from "tiktoken/lite"). The char-based heuristic
// is ~20% off for English but adequate for chunking targets.
function countTokens(s: string): number {
  return Math.ceil(s.length / 4);
}
