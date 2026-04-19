import { createHmac, timingSafeEqual } from "node:crypto";

export function signHmac(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyHmac(secret: string, body: string, signature: string): boolean {
  const expected = signHmac(secret, body);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
