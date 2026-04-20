export const TELEGRAM_EVENT_TYPES = [
  "NEW_LEAD",
  "PUSHED",
  "ACCEPTED",
  "DECLINED",
  "FTD",
  "FAILED",
  "FRAUD_HIT",
  "MANUAL_REVIEW_QUEUED",
  "PENDING_HOLD_START",
  "PENDING_HOLD_RELEASED",
  "SHAVE_SUSPECTED",
  "BROKER_DOWN",
  "BROKER_RECOVERED",
  "CAP_REACHED",
  "AUTOLOGIN_DOWN",
  "AUTOLOGIN_SLA_BREACHED",
  "PROXY_POOL_DEGRADED",
  "DAILY_SUMMARY",
  "ANOMALY_DETECTED",
  "FRAUD_POLICY_CHANGED",
  "BROKER_CONFIG_CHANGED",
  "AFFILIATE_DAILY_SUMMARY",
  "AFFILIATE_FTD",
] as const;

export type TelegramEventType = (typeof TELEGRAM_EVENT_TYPES)[number];

export const ADMIN_ONLY_EVENTS: ReadonlySet<TelegramEventType> = new Set<TelegramEventType>([
  "BROKER_CONFIG_CHANGED",
  "FRAUD_POLICY_CHANGED",
  "AUTOLOGIN_DOWN",
  "AUTOLOGIN_SLA_BREACHED",
  "PROXY_POOL_DEGRADED",
]);

export function isTelegramEventType(v: string): v is TelegramEventType {
  return (TELEGRAM_EVENT_TYPES as readonly string[]).includes(v);
}
