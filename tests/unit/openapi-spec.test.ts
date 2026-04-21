import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

describe("docs/api/v1/openapi.yaml (zod-generated)", () => {
  const yamlPath = join(process.cwd(), "docs", "api", "v1", "openapi.yaml");

  it("exists at the expected path", () => {
    expect(existsSync(yamlPath)).toBe(true);
  });

  it("is valid YAML and carries a 3.0.0 openapi header", () => {
    const doc = YAML.parse(readFileSync(yamlPath, "utf8")) as Record<string, unknown>;
    expect(doc.openapi).toBe("3.0.0");
    expect(doc.info).toBeDefined();
  });

  it("includes zod-generated and hand-authored paths", () => {
    const doc = YAML.parse(readFileSync(yamlPath, "utf8")) as {
      paths: Record<string, unknown>;
    };
    // zod-generated:
    expect(doc.paths["/api/v1/leads"]).toBeDefined();
    expect(doc.paths["/api/v1/leads/bulk"]).toBeDefined();
    expect(doc.paths["/api/v1/health"]).toBeDefined();
    // hand-authored-merged:
    expect(doc.paths["/api/v1/routing/simulate"]).toBeDefined();
    expect(doc.paths["/api/v1/schema/leads"]).toBeDefined();
    expect(doc.paths["/api/v1/errors"]).toBeDefined();
    expect(doc.paths["/api/v1/metrics/summary"]).toBeDefined();
  });

  it("registers LeadCreate (derived from the zod intake schema) as a component", () => {
    const doc = YAML.parse(readFileSync(yamlPath, "utf8")) as {
      components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
    };
    const lc = doc.components.schemas.LeadCreate;
    expect(lc).toBeDefined();
    expect(lc.properties).toBeDefined();
    // Fields lifted from src/server/zod/intake.ts:
    expect(lc.properties?.geo).toBeDefined();
    expect(lc.properties?.ip).toBeDefined();
    expect(lc.properties?.event_ts).toBeDefined();
  });
});
