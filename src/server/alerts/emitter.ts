import { logger } from "@/server/observability";
import { emitTelegramEvent } from "@/server/telegram/emit";
import type { TelegramEventType } from "@/server/telegram/event-catalog";

export type AlertEvent =
  | "manual_queue_enqueued"
  | "manual_queue_depth_exceeded"
  | "broker_down"
  | "fraud_hit";

export type AlertPayload = Record<string, unknown>;

const __calls: Array<{ event: AlertEvent; payload: AlertPayload; at: Date }> = [];

const TELEGRAM_MAP: Record<AlertEvent, TelegramEventType | null> = {
  manual_queue_enqueued: "MANUAL_REVIEW_QUEUED",
  manual_queue_depth_exceeded: "MANUAL_REVIEW_QUEUED",
  broker_down: "BROKER_DOWN",
  fraud_hit: "FRAUD_HIT",
};

export async function emitAlert(event: AlertEvent, payload: AlertPayload): Promise<void> {
  __calls.push({ event, payload, at: new Date() });
  logger.info({ alertEvent: event, payload }, "[alert] event emitted");
  const tgType = TELEGRAM_MAP[event];
  if (tgType) {
    const brokerId = typeof payload.brokerId === "string" ? payload.brokerId : undefined;
    const affiliateId = typeof payload.affiliateId === "string" ? payload.affiliateId : undefined;
    try {
      await emitTelegramEvent(tgType, payload, { brokerId, affiliateId });
    } catch (e) {
      logger.warn({ err: (e as Error).message, event }, "[alert] telegram forwarding failed");
    }
  }
}

// Test-only helpers — do not import from production code.
export function __getAlertCalls() {
  return [...__calls];
}

export function __resetAlertCalls() {
  __calls.length = 0;
}
