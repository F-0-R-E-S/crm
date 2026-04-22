import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { runDocsRegen } from "@/../scripts/docs-regen";
import { beforeAll, describe, expect, it } from "vitest";

const CONTENT_ROOT = resolve(process.cwd(), "content/docs");

describe("docs-regen orchestrator (write mode)", () => {
  beforeAll(async () => {
    await rm(CONTENT_ROOT, { recursive: true, force: true });
  });

  it("writes _deep files for every block with extracted content", async () => {
    const manifest = await runDocsRegen({ mode: "write", cwd: process.cwd() });
    expect(manifest.blocks.length).toBeGreaterThan(0);

    const intakeSchema = await readFile(resolve(CONTENT_ROOT, "intake/_deep/prisma.md"), "utf8");
    expect(intakeSchema).toMatch(/# Lead/);
    expect(intakeSchema).toMatch(/audience: ai-deep/);
    expect(intakeSchema).toMatch(/source: auto-gen/);

    const intakeTrpc = await readFile(resolve(CONTENT_ROOT, "intake/_deep/trpc.md"), "utf8");
    expect(intakeTrpc).toMatch(/lead\./);
  }, 60_000);

  it("check mode returns drift=false on a freshly written tree", async () => {
    await runDocsRegen({ mode: "write", cwd: process.cwd() });
    const manifest = await runDocsRegen({ mode: "check", cwd: process.cwd() });
    expect(manifest).toHaveProperty("drift");
    expect((manifest as any).drift).toEqual([]);
  }, 60_000);
});
