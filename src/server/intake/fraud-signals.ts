import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { FraudSignal } from "./fraud-score";

export interface BuildSignalsInput {
  blacklistHit: "ip_blocked" | "email_domain_blocked" | "phone_blocked" | null;
  phoneE164: string | null;
  geo: string;
  dedupHit: boolean;
  voipHit: boolean;
  patternHit?: boolean;
}

export function buildSignals(input: BuildSignalsInput): FraudSignal[] {
  const signals: FraudSignal[] = [];

  if (input.blacklistHit) {
    signals.push({ kind: "blacklist", detail: { reason: input.blacklistHit } });
  }

  if (input.phoneE164 && input.geo) {
    const p = parsePhoneNumberFromString(input.phoneE164);
    const phoneCountry = p?.country;
    if (phoneCountry && phoneCountry !== input.geo.toUpperCase()) {
      signals.push({
        kind: "geo_mismatch",
        detail: { expected: input.geo.toUpperCase(), phoneCountry },
      });
    }
  }

  if (input.voipHit) signals.push({ kind: "voip" });
  if (input.dedupHit) signals.push({ kind: "dedup_hit" });
  if (input.patternHit) signals.push({ kind: "pattern_hit" });

  return signals;
}
