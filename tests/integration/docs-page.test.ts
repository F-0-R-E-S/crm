import { describe, expect, it } from "vitest";

describe("/docs/[...slug]", () => {
  it("renders a known human page", async () => {
    const res = await fetch("http://localhost:3000/docs/intake");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/Lead Intake/);
  });

  it("returns 404 for slug that points to _deep content", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/_deep/db-schema");
    expect(res.status).toBe(404);
  });

  it("404s on nonexistent slug", async () => {
    const res = await fetch("http://localhost:3000/docs/does-not-exist/anywhere");
    expect(res.status).toBe(404);
  });

  it("renders TOC anchors for h2/h3 headings", async () => {
    const res = await fetch("http://localhost:3000/docs/intake");
    const html = await res.text();
    expect(html).toMatch(/<h[23]\s+id=/);
  });
});
