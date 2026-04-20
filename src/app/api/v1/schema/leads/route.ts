import { DEFAULT_VERSION, getSchemaForVersion, listVersions } from "@/server/schema/registry";
import { NextResponse } from "next/server";
import { zodToJsonSchema } from "zod-to-json-schema";

const EXAMPLE = {
  external_lead_id: "lead-42",
  first_name: "Ivan",
  last_name: "Ivanov",
  email: "ivan@example.com",
  phone: "+380501112233",
  geo: "UA",
  ip: "8.8.8.8",
  landing_url: "https://example.com/lp",
  sub_id: "affsub-1",
  utm: { utm_source: "fb", utm_campaign: "c1" },
  event_ts: "2026-04-20T10:00:00Z",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const version = url.searchParams.get("version") ?? DEFAULT_VERSION;
  const schema = getSchemaForVersion(version);
  if (!schema) {
    return NextResponse.json(
      {
        error: {
          code: "unsupported_version",
          message: `api version ${version} is not supported`,
          available: listVersions().map((v) => ({ version: v.version, status: v.status })),
        },
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    version,
    schema: zodToJsonSchema(schema, { name: `IntakeLead_${version}` }),
    example: EXAMPLE,
  });
}
