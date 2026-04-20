/**
 * Regenerate docs/api/v1/openapi.json from openapi.yaml.
 *
 * The yaml is hand-maintained for v1.0 — it's the source of truth. This script
 * produces a JSON sibling for consumers that prefer JSON (Postman, k6, etc.).
 *
 * Future iteration (v1.5+): wire `@asteasolutions/zod-to-openapi` so the spec
 * is generated from the Zod schemas in `src/server/schema/registry.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

const yamlPath = join(process.cwd(), "docs", "api", "v1", "openapi.yaml");
const jsonPath = join(process.cwd(), "docs", "api", "v1", "openapi.json");

const raw = readFileSync(yamlPath, "utf8");
const doc = YAML.parse(raw) as Record<string, unknown>;
if (!doc || typeof doc !== "object" || !("openapi" in doc)) {
  console.error("invalid openapi.yaml — missing 'openapi' key");
  process.exit(1);
}
writeFileSync(jsonPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${jsonPath}`);
