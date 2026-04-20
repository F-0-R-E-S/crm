import { normalizeGeo } from "@/lib/geo";
import { normalizePhone } from "./phone";

export type NormalizationWarning = {
  code: "geo_mismatch";
  payloadGeo: string;
  ipGeo: string;
};

export type NormalizationError = { field: string; code: string };

export interface NormalizeInput {
  phone: string | null | undefined;
  email: string | null | undefined;
  geo: string;
  ip: string;
  landingUrl?: string | null;
  ipGeoLookup?: (ip: string) => string | null;
}

export interface NormalizeOutput {
  phoneE164: string | null;
  email: string | null;
  geo: string | null;
  warnings: NormalizationWarning[];
  error: NormalizationError | null;
  raw: Pick<NormalizeInput, "phone" | "email" | "geo">;
}

export function normalizeIntake(input: NormalizeInput): NormalizeOutput {
  const raw = {
    phone: input.phone ?? null,
    email: input.email ?? null,
    geo: input.geo,
  };
  const warnings: NormalizationWarning[] = [];

  const trimmedEmail = input.email?.trim() ?? "";
  const email = trimmedEmail.length === 0 ? null : trimmedEmail.toLowerCase();

  const geo = normalizeGeo(input.geo);
  if (!geo) {
    return {
      phoneE164: null,
      email,
      geo: null,
      warnings,
      error: { field: "geo", code: "geo_unknown" },
      raw,
    };
  }

  let phoneE164: string | null = null;
  if (input.phone) {
    phoneE164 = normalizePhone(input.phone, geo);
    if (!phoneE164) {
      return {
        phoneE164: null,
        email,
        geo,
        warnings,
        error: { field: "phone", code: "phone_invalid" },
        raw,
      };
    }
  }

  if (input.ipGeoLookup) {
    const ipGeo = input.ipGeoLookup(input.ip);
    if (ipGeo && ipGeo !== geo) {
      warnings.push({ code: "geo_mismatch", payloadGeo: geo, ipGeo });
    }
  }

  return { phoneE164, email, geo, warnings, error: null, raw };
}
