import { z } from "zod";
import { BLOCK_CATALOG } from "../../scripts/docs-regen/block-catalog";

const BLOCK_IDS = BLOCK_CATALOG.map((b) => b.id) as [string, ...string[]];

export const DocsFrontmatterSchema = z.object({
  audience: z.enum(["human", "ai-deep"]),
  block: z.enum(BLOCK_IDS, {
    errorMap: () => ({ message: "block must be a valid block id from BLOCK_CATALOG" }),
  }),
  source: z.enum(["hand", "auto-gen", "hybrid"]),
  kind: z
    .enum([
      "prisma",
      "trpc",
      "rest",
      "env",
      "errors",
      "telegram",
      "jobs",
      "invariants",
      "overview",
      "how-to",
      "concepts",
      "openapi",
    ])
    .optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().default(9999),
  slugOverride: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type DocsFrontmatter = z.infer<typeof DocsFrontmatterSchema>;

export function parseDocsFrontmatter(raw: unknown): DocsFrontmatter {
  return DocsFrontmatterSchema.parse(raw);
}
