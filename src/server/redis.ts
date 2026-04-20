import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ?? new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });

// Prevent unhandled 'error' event from crashing the process when Redis is unavailable
redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
