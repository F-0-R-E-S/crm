export type BlockId = string;

export interface Section {
  source: "prisma" | "trpc" | "rest" | "env" | "errors" | "telegram" | "jobs" | "invariants";
  heading: string;
  body: string;
  anchor: string;
}

export interface BlockOutput {
  id: BlockId;
  title: string;
  sections: Section[];
}

export interface RegenManifest {
  generatedAt: string;
  blocks: BlockOutput[];
  sourceCommit: string | null;
}

export interface RegenOptions {
  mode: "dry" | "write" | "check";
  cwd: string;
}
