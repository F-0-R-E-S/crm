import { describe, expect, it } from "vitest";

describe("docs subsite e2e", () => {
  it("landing → block page → next page chain works", async () => {
    const landingRes = await fetch("http://localhost:3000/docs");
    expect(landingRes.status).toBe(200);
    const landing = await landingRes.text();
    const firstBlockHref = landing.match(/href="(\/docs\/[^"]+)"/)?.[1];
    expect(firstBlockHref).toBeTruthy();

    const pageRes = await fetch(`http://localhost:3000${firstBlockHref}`);
    expect(pageRes.status).toBe(200);
    const page = await pageRes.text();
    expect(page).toMatch(/Next →|Previous ←|← Previous/);
  });

  it("_deep paths are hidden everywhere", async () => {
    const pages = ["/docs", "/docs/intake"];
    for (const path of pages) {
      const res = await fetch(`http://localhost:3000${path}`);
      const html = await res.text();
      expect(html).not.toMatch(/\/_deep\//);
    }
    const robots = await (await fetch("http://localhost:3000/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/_deep/);
  });
});
