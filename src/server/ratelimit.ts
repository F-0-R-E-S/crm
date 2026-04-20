import { redis } from "./redis";

const SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillPerSec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1]) or capacity
local ts = tonumber(data[2]) or now
local delta = math.max(0, now - ts)
tokens = math.min(capacity, tokens + delta * refillPerSec)
if tokens < 1 then
  local retryAfter = math.ceil((1 - tokens) / refillPerSec)
  redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
  redis.call('EXPIRE', key, 3600)
  return {0, retryAfter}
end
tokens = tokens - 1
redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, 3600)
return {1, 0}
`;

export interface RateLimitOpts {
  capacity: number;
  refillPerSec: number;
}

export async function checkRateLimit(
  key: string,
  opts: RateLimitOpts,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  if (opts.capacity <= 0 || opts.refillPerSec <= 0) {
    throw new Error("rate limit opts invalid: capacity and refillPerSec must be > 0");
  }
  const now = Math.floor(Date.now() / 1000);
  const res = (await redis.eval(SCRIPT, 1, key, opts.capacity, opts.refillPerSec, now)) as [
    number,
    number,
  ];
  return { allowed: res[0] === 1, retryAfterSec: res[1] };
}

/**
 * Simple fixed-window counter (increment + expire).
 * Used for low-frequency endpoints (signup, password reset).
 * Returns true if the call is within the limit.
 */
export async function rateLimit({
  key,
  limit,
  windowSeconds,
}: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<boolean> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count <= limit;
}
