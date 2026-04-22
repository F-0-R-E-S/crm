import { describe, expect, it } from "vitest";

describe("direct _deep route access", () => {
  it("200s on a real _deep file", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/_deep/db-schema");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/AI-deep reference/);
  });
  it("404s on a fake _deep file", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/_deep/does-not-exist");
    expect(res.status).toBe(404);
  });
});
