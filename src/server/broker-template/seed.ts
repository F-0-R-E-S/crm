import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

type SeedRow = Prisma.BrokerTemplateCreateInput;

const FOREX_STATUS_MAP = {
  new: "NEW",
  accepted: "ACCEPTED",
  declined: "DECLINED",
  ftd: "FTD",
};
const CRYPTO_STATUS_MAP = {
  created: "NEW",
  verified: "ACCEPTED",
  rejected: "DECLINED",
  deposit: "FTD",
};
const GAMBLE_STATUS_MAP = {
  registered: "NEW",
  active: "ACCEPTED",
  banned: "DECLINED",
  first_deposit: "FTD",
};

function row(i: number, vertical: "forex" | "crypto" | "gambling", countries: string[]): SeedRow {
  const vendor = ["Alpha", "Beta", "Gamma", "Delta", "Sigma", "Omega"][i % 6];
  const protocol = i % 4 === 3 ? "rest-form" : "rest-json";
  const authType =
    i % 5 === 0
      ? "NONE"
      : i % 5 === 1
        ? "BEARER"
        : i % 5 === 2
          ? "BASIC"
          : i % 5 === 3
            ? "API_KEY_HEADER"
            : "API_KEY_QUERY";
  const statusMap =
    vertical === "forex"
      ? FOREX_STATUS_MAP
      : vertical === "crypto"
        ? CRYPTO_STATUS_MAP
        : GAMBLE_STATUS_MAP;

  return {
    slug: `${vertical}-${vendor.toLowerCase()}-${i}`,
    name: `${vendor} ${vertical[0].toUpperCase()}${vertical.slice(1)} CRM v${(i % 3) + 1}`,
    vendor,
    vertical,
    protocol,
    status: "active",
    countries,
    description: `${vendor} integration for ${vertical} vertical (seed).`,
    defaultHttpMethod: "POST",
    defaultHeaders: { "content-type": "application/json" },
    defaultAuthType: authType as Prisma.BrokerTemplateCreateInput["defaultAuthType"],
    authConfigSchema:
      authType === "BEARER"
        ? {
            type: "object",
            required: ["token"],
            properties: { token: { type: "string", minLength: 16 } },
          }
        : authType === "BASIC"
          ? {
              type: "object",
              required: ["user", "password"],
              properties: {
                user: { type: "string" },
                password: { type: "string" },
              },
            }
          : authType === "API_KEY_HEADER"
            ? {
                type: "object",
                required: ["headerName", "token"],
                properties: {
                  headerName: { type: "string" },
                  token: { type: "string" },
                },
              }
            : authType === "API_KEY_QUERY"
              ? {
                  type: "object",
                  required: ["paramName", "token"],
                  properties: {
                    paramName: { type: "string" },
                    token: { type: "string" },
                  },
                }
              : { type: "object" },
    fieldMapping: {
      firstName: "first_name",
      lastName: "last_name",
      email: "email",
      phone: "phone",
      geo: "country",
      subId: "sub_id",
    },
    requiredFields: ["first_name", "email", "phone", "country"],
    staticPayload: { source: "gambchamp" },
    responseIdPath: "$.lead_id",
    postbackLeadIdPath: "$.lead_id",
    postbackStatusPath: "$.status",
    statusMapping: statusMap,
    rateLimitPerMin: 60,
    samplePayload: {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone: "+380501234567",
      country: countries[0],
      sub_id: "aff-123",
    },
    sampleResponse: { lead_id: "ext-abc-123", status: "new" },
  };
}

export async function seedBrokerTemplates(): Promise<number> {
  const rows: SeedRow[] = [
    row(1, "forex", ["UA", "PL", "DE"]),
    row(2, "forex", ["UK", "IE"]),
    row(3, "forex", ["IT", "ES"]),
    row(4, "forex", ["BR", "MX"]),
    row(5, "forex", ["ID", "MY", "TH"]),
    row(6, "forex", ["AU", "NZ"]),
    row(7, "forex", ["ZA"]),
    row(8, "forex", ["CA"]),
    row(9, "crypto", ["UA", "PL"]),
    row(10, "crypto", ["DE", "NL"]),
    row(11, "crypto", ["BR"]),
    row(12, "crypto", ["IN", "PK"]),
    row(13, "crypto", ["JP", "KR"]),
    row(14, "crypto", ["TR"]),
    row(15, "gambling", ["UK"]),
    row(16, "gambling", ["DE", "AT"]),
    row(17, "gambling", ["FI", "SE"]),
    row(18, "gambling", ["PT"]),
    row(19, "gambling", ["CZ", "SK"]),
    row(20, "gambling", ["GR", "CY"]),
  ];

  let created = 0;
  for (const data of rows) {
    await prisma.brokerTemplate.upsert({
      where: { slug: data.slug },
      create: data,
      update: {},
    });
    created++;
  }
  return created;
}
