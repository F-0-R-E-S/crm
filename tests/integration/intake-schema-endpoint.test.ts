import { GET } from "@/app/api/v1/schema/leads/route";
import { describe, expect, it } from "vitest";

describe("GET /api/v1/schema/leads", () => {
  it("возвращает JSON Schema для 2026-01", async () => {
    const r = await GET(new Request("http://localhost:3000/api/v1/schema/leads?version=2026-01"));
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.version).toBe("2026-01");
    expect(b.schema).toBeDefined();
    expect(b.example).toBeDefined();
    expect(b.example.geo).toHaveLength(2);
  });

  it("400 для неизвестной версии", async () => {
    const r = await GET(new Request("http://localhost:3000/api/v1/schema/leads?version=1999-01"));
    expect(r.status).toBe(400);
  });
});
