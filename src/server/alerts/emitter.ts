import { logger } from "@/server/observability";

export type AlertEvent =
	| "manual_queue_enqueued"
	| "manual_queue_depth_exceeded"
	| "broker_down"
	| "fraud_hit";

export type AlertPayload = Record<string, unknown>;

const __calls: Array<{ event: AlertEvent; payload: AlertPayload; at: Date }> = [];

export async function emitAlert(event: AlertEvent, payload: AlertPayload): Promise<void> {
	// S3: stub. S5 wires Telegram transport.
	__calls.push({ event, payload, at: new Date() });
	logger.info(
		{ alertEvent: event, payload },
		"[alert:stub] event emitted (telegram transport pending S5)",
	);
}

// Test-only helpers — do not import from production code.
export function __getAlertCalls() {
	return [...__calls];
}

export function __resetAlertCalls() {
	__calls.length = 0;
}
