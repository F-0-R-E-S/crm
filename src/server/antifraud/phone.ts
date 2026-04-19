import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(raw: string, geoHint?: string): string | null {
  try {
    const p = parsePhoneNumberFromString(
      raw,
      geoHint as Parameters<typeof parsePhoneNumberFromString>[1],
    );
    if (!p?.isValid()) return null;
    return p.number;
  } catch {
    return null;
  }
}
