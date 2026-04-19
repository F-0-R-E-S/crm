import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ?? new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
