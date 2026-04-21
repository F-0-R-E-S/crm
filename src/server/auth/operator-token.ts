import type { UserRole } from "@prisma/client";
import { SignJWT, errors as joseErrors, jwtVerify } from "jose";

const ISSUER = "crm-node";
const AUDIENCE = "crm-tycoon";
const ALG = "HS256";
const DEFAULT_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export interface OperatorTokenClaims {
  userId: string;
  role: UserRole;
  scope: "operator";
}

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET (or AUTH_SECRET) missing or too short (>= 32 bytes required)");
  }
  return new TextEncoder().encode(secret);
}

export async function signOperatorToken(
  input: { userId: string; role: UserRole },
  opts: { ttlSec?: number; expSec?: number } = {},
): Promise<string> {
  const exp = opts.expSec ?? Math.floor(Date.now() / 1000) + (opts.ttlSec ?? DEFAULT_TTL_SEC);
  return new SignJWT({ scope: "operator", role: input.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(input.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifyOperatorToken(token: string): Promise<OperatorTokenClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: [ALG],
  });
  const role = payload.role as UserRole | undefined;
  const scope = payload.scope;
  const sub = payload.sub;
  if (!sub || !role || scope !== "operator") {
    throw new Error("malformed operator token claims");
  }
  return { userId: sub, role, scope };
}

export { joseErrors as operatorTokenErrors };
