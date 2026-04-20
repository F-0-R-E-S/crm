import { redis } from "@/server/redis";

const PREFIX = "metrics:rolling:";
const WINDOW_SECONDS = 60;

export const COUNTER_NAMES = {
  LEADS_RECEIVED: "leads_received",
  LEADS_PUSHED: "leads_pushed",
  FRAUD_HIT: "fraud_hit",
  BROKER_DOWN: "broker_down_count",
  MANUAL_QUEUE_DEPTH: "manual_queue_depth",
} as const;

export type CounterName = (typeof COUNTER_NAMES)[keyof typeof COUNTER_NAMES];

function key(name: string): string {
  return `${PREFIX}${name}`;
}

/**
 * Add `by` event occurrences to the rolling window for `name`. Uses a Redis
 * sorted-set; each call appends unique members with the current unix-second
 * as score. Keys TTL out 2×window after the last write so stale counters
 * don't grow unbounded.
 */
export async function incrCounter(name: string, by = 1): Promise<void> {
  const k = key(name);
  const now = Math.floor(Date.now() / 1000);
  const pipe = redis.multi();
  for (let i = 0; i < by; i++) {
    const member = `${now}-${i}-${Math.random().toString(36).slice(2)}`;
    pipe.zadd(k, now, member);
  }
  pipe.expire(k, WINDOW_SECONDS * 2);
  await pipe.exec();
}

/**
 * Count events in the last WINDOW_SECONDS for `name`. Performs a lazy GC
 * (zremrangebyscore) before the count — no background sweeper required.
 */
export async function readCounter(name: string): Promise<number> {
  const k = key(name);
  const now = Math.floor(Date.now() / 1000);
  await redis.zremrangebyscore(k, 0, now - WINDOW_SECONDS);
  return await redis.zcard(k);
}

export async function readAll(names: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const n of names) {
    out[n] = await readCounter(n);
  }
  return out;
}
