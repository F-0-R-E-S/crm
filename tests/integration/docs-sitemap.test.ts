import { describe, expect, it } from "vitest";

describe("/sitemap.xml + /robots.txt", () => {
  it("sitemap lists every human docs slug", async () => {
    const res = await fetch("http://localhost:3000/sitemap.xml");
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toMatch(/\/docs\/intake/);
    expect(xml).not.toMatch(/_deep/);
  });

  it("robots.txt disallows _deep paths", async () => {
    const res = await fetch("http://localhost:3000/robots.txt");
    const txt = await res.text();
    expect(txt).toMatch(/Disallow: \/_deep/);
  });
});
