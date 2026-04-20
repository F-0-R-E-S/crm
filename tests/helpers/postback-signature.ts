import { signHmac } from "@/server/postback/hmac";

/** Convenience re-export for tests — matches the plan naming. */
export function signPostback(body: string, secret: string): string {
	return signHmac(secret, body);
}
