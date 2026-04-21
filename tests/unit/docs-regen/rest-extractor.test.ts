import { extractRest } from "@/../scripts/docs-regen/extractors/rest";
import { describe, expect, it } from "vitest";

describe("rest extractor", () => {
  it("walks src/app/api/**/route.ts and emits one section per HTTP verb", async () => {
    const out = await extractRest({ appApiDir: "src/app/api" });
    const intake = out.get("intake") ?? [];
    expect(intake.some((s) => s.heading === "POST /api/v1/leads")).toBe(true);
    expect(intake.some((s) => s.heading === "POST /api/v1/leads/bulk")).toBe(true);
  });

  it("resolves dynamic segments to brace form", async () => {
    const out = await extractRest({ appApiDir: "src/app/api" });
    const postbacks = out.get("postback-status-groups") ?? [];
    expect(postbacks.some((s) => s.heading === "POST /api/v1/postbacks/{brokerId}")).toBe(true);
  });

  it("prefers merged OpenAPI spec when available", async () => {
    const out = await extractRest({
      appApiDir: "src/app/api",
      openapiYamlPath: "docs/api/v1/openapi.yaml",
    });
    const intake = out.get("intake") ?? [];
    const postLeads = intake.find((s) => s.heading === "POST /api/v1/leads");
    expect(postLeads!.body).toMatch(/Request body/);
  });
});
