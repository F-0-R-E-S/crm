import { createHash } from "node:crypto";

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const h = createHash("sha256").update(local).digest("hex").slice(0, 8);
  return `${h}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskIp(ip: string): string {
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length < 3) return "::/56";
    const head = parts.slice(0, 3).map((p) => p || "0");
    head[2] = `${head[2].padStart(4, "0").slice(0, 2)}00`;
    return `${head.join(":")}::/56`;
  }
  const [a, b, c] = ip.split(".");
  return `${a}.${b}.${c}.0/24`;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;
const PHONE_RE = /^\+?\d[\d\s\-()]{6,}$/;

const SENSITIVE_KEYS = new Set(["email", "phone", "ip", "first_name", "last_name"]);

export function redactObject(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactObject);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEYS.has(k) && typeof v === "string") {
        if (k === "email" && EMAIL_RE.test(v)) out[k] = maskEmail(v);
        else if (k === "phone" && PHONE_RE.test(v)) out[k] = maskPhone(v);
        else if (k === "ip" && (IPV4_RE.test(v) || IPV6_RE.test(v))) out[k] = maskIp(v);
        else if (k === "first_name" || k === "last_name")
          out[k] = v.length > 1 ? `${v[0]}***` : "***";
        else out[k] = v;
      } else {
        out[k] = redactObject(v);
      }
    }
    return out;
  }
  return input;
}
