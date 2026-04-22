import { describe, it, expect } from "vitest";

describe("docs cmdk", () => {
  it("palette button renders with keyboard hint", async () => {
    const res = await fetch("http://localhost:3000/docs");
    const html = await res.text();
    expect(html).toMatch(/⌘K/);
    expect(html).toMatch(/Search docs/);
  });
});
