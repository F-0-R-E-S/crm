import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

const als = new AsyncLocalStorage<{ traceId: string }>();

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { app: "crm-node", env: process.env.NODE_ENV ?? "development" },
  redact: {
    paths: [
      "authorization",
      "cookie",
      "headers.authorization",
      "headers.cookie",
      "body.email",
      "body.phone",
      "body.password",
      "*.apiKey",
      "*.api_key",
      "*.password",
    ],
    censor: "[REDACTED]",
  },
  transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
  mixin() {
    const store = als.getStore();
    return store ? { trace_id: store.traceId } : {};
  },
});

export function runWithTrace<T>(traceId: string, fn: () => T | Promise<T>): T | Promise<T> {
  return als.run({ traceId }, fn);
}

export function getTraceId(): string | undefined {
  return als.getStore()?.traceId;
}
