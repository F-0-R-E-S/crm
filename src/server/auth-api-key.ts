import { createHash } from "node:crypto";
import { prisma } from "./db";

export interface ApiKeyCtx {
  affiliateId: string;
  keyId: string;
  isSandbox: boolean;
  allowedIps: string[];
}

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export async function verifyApiKey(
  authHeader: string | null | undefined,
): Promise<ApiKeyCtx | null> {
  if (!authHeader) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!m) return null;
  const keyHash = sha256(m[1]);
  const row = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!row || row.isRevoked) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  return {
    affiliateId: row.affiliateId,
    keyId: row.id,
    isSandbox: row.isSandbox,
    allowedIps: row.allowedIps,
  };
}
