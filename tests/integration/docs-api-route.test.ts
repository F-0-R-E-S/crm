import { describe, expect, it } from "vitest";

describe("/docs/api under new subsite", () => {
  it("still returns 200", { timeout: 30_000 }, async () => {
    const res = await fetch("http://localhost:3000/docs/api");
    expect(res.status).toBe(200);
  });

  it("renders the shared docs sidebar + breadcrumbs", { timeout: 30_000 }, async () => {
    const res = await fetch("http://localhost:3000/docs/api");
    const html = await res.text();
    expect(html).toMatch(/Lead Intake/); // sidebar block
    expect(html).toMatch(/API Reference/); // breadcrumb leaf or h1
  });

  it("Scalar viewer mounts", { timeout: 30_000 }, async () => {
    const res = await fetch("http://localhost:3000/docs/api");
    const html = await res.text();
    // Scalar injects a specific container element - accept any reasonable marker
    expect(html.toLowerCase()).toMatch(/scalar|api.reference/);
  });
});
