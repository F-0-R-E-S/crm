import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  try {
    const yaml = readFileSync(
      join(process.cwd(), "docs", "api", "v1", "openapi.yaml"),
      "utf8",
    );
    return new Response(yaml, {
      status: 200,
      headers: { "content-type": "application/yaml; charset=utf-8" },
    });
  } catch {
    return new Response("spec not found", { status: 404 });
  }
}
