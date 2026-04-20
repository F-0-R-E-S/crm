export type Theme = "dark" | "light";

export type LeadStateKey =
  | "NEW"
  | "VALIDATING"
  | "REJECTED"
  | "REJECTED_FRAUD"
  | "PUSHING"
  | "PUSHED"
  | "PENDING_HOLD"
  | "ACCEPTED"
  | "DECLINED"
  | "FTD"
  | "FAILED";

export type Tone = "neutral" | "success" | "warn" | "danger" | "info" | "accent";

const STATE_COLORS: Record<Theme, Record<LeadStateKey, string>> = {
  dark: {
    NEW: "oklch(75% 0.02 250)",
    VALIDATING: "oklch(78% 0.11 75)",
    PUSHING: "oklch(76% 0.12 220)",
    PUSHED: "oklch(78% 0.14 200)",
    PENDING_HOLD: "oklch(80% 0.15 85)",
    ACCEPTED: "oklch(78% 0.13 155)",
    FTD: "oklch(82% 0.17 135)",
    DECLINED: "oklch(72% 0.14 25)",
    REJECTED: "oklch(65% 0.03 20)",
    REJECTED_FRAUD: "oklch(58% 0.18 15)",
    FAILED: "oklch(62% 0.15 20)",
  },
  light: {
    NEW: "oklch(55% 0.02 250)",
    VALIDATING: "oklch(58% 0.14 75)",
    PUSHING: "oklch(52% 0.15 220)",
    PUSHED: "oklch(50% 0.15 200)",
    PENDING_HOLD: "oklch(55% 0.17 85)",
    ACCEPTED: "oklch(48% 0.14 155)",
    FTD: "oklch(45% 0.17 135)",
    DECLINED: "oklch(52% 0.18 25)",
    REJECTED: "oklch(50% 0.03 20)",
    REJECTED_FRAUD: "oklch(42% 0.20 15)",
    FAILED: "oklch(45% 0.18 20)",
  },
};

const STATE_TONES: Record<LeadStateKey, Tone> = {
  NEW: "neutral",
  VALIDATING: "warn",
  PUSHING: "info",
  PUSHED: "info",
  PENDING_HOLD: "warn",
  ACCEPTED: "success",
  FTD: "success",
  DECLINED: "danger",
  REJECTED: "neutral",
  REJECTED_FRAUD: "danger",
  FAILED: "danger",
};

export function stateColor(state: LeadStateKey, theme: Theme): string {
  return STATE_COLORS[theme][state];
}

export function stateToTone(state: LeadStateKey): Tone {
  return STATE_TONES[state];
}
