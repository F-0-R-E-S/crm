// In-a-row rejection counter. Matches iREV's "Rejections In a Row"
// auto-pause: a configurable N-count of consecutive broker rejections
// triggers a broker-level pause.
//
// Counter is intentionally Redis-only (not CapCounter in Postgres)
// because it's a transient signal, not a durable budget. If Redis
// flips, we silently "forgive" the streak — better than false-positive
// pausing a broker due to cache loss.
//
// Key shape: `cap:streak:{brokerId}:{flowVersionId}`. Scoped per-flow
// so parallel published flows can't interfere; the push-lead worker
// passes the flowVersionId it's running under.

import { redis } from "@/server/redis";

const KEY_PREFIX = "cap:streak";
// Streak counters shouldn't outlive the relevant cap window; give them
// a generous TTL so forgotten rejections naturally decay.
const STREAK_TTL_SECONDS = 60 * 60 * 24; // 24h

function streakKey(brokerId: string, flowVersionId: string): string {
  return `${KEY_PREFIX}:${brokerId}:${flowVersionId}`;
}

/** Bump the in-a-row counter; returns the new count. */
export async function bumpRejectionStreak(
  brokerId: string,
  flowVersionId: string,
): Promise<number> {
  const key = streakKey(brokerId, flowVersionId);
  const next = await redis.incr(key);
  await redis.expire(key, STREAK_TTL_SECONDS);
  return next;
}

/** Reset the in-a-row counter — called on a successful push. */
export async function resetRejectionStreak(brokerId: string, flowVersionId: string): Promise<void> {
  await redis.del(streakKey(brokerId, flowVersionId));
}

/** Read the current counter without mutating. Primarily for tests. */
export async function readRejectionStreak(
  brokerId: string,
  flowVersionId: string,
): Promise<number> {
  const v = await redis.get(streakKey(brokerId, flowVersionId));
  return v ? Number.parseInt(v, 10) : 0;
}

/**
 * Pure predicate: should we auto-pause the broker given a freshly
 * bumped streak count and the cap definition's threshold? Threshold
 * being null/undefined means "feature disabled".
 */
export function shouldAutoPause(
  streakCount: number,
  threshold: number | null | undefined,
): boolean {
  if (threshold == null) return false;
  return streakCount >= threshold;
}
