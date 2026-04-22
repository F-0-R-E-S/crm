import { describe, expect, it } from "vitest";

describe("/docs route", () => {
  it("renders the landing with all block cards", async () => {
    const res = await fetch("http://localhost:3000/docs");
    expect(res.status).toBe(200);
    const html = await res.text();
    const blockLinks = [...html.matchAll(/href="\/docs\/([a-z-]+)"/g)].map((m) => m[1]);
    expect(new Set(blockLinks).size).toBeGreaterThanOrEqual(10);
  });

  it("does not render any _deep links on the landing", async () => {
    const res = await fetch("http://localhost:3000/docs");
    const html = await res.text();
    expect(html).not.toMatch(/_deep/);
  });
});
