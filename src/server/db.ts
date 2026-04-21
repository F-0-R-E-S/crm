import { PrismaClient } from "@prisma/client";
import { attachTenantMiddleware } from "./db-tenant";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaMiddlewareAttached?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Attach tenant middleware once, lazy — triggered on first import from a
// real server path (not Edge). Next.js Edge runtime bundles a separate copy
// so the attach will only ever run in Node.
function isEdge(): boolean {
  if (typeof process !== "undefined" && process.env?.NEXT_RUNTIME === "edge") return true;
  if (typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined") return true;
  return false;
}
if (!globalForPrisma.prismaMiddlewareAttached && !isEdge()) {
  attachTenantMiddleware(prisma);
  globalForPrisma.prismaMiddlewareAttached = true;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
