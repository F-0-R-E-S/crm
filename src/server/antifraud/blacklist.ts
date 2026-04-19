import { prisma } from "@/server/db";

function ipInCidr(ip: string, cidr: string): boolean {
  const [net, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const ipInt = ipToInt(ip);
  const netInt = ipToInt(net);
  if (Number.isNaN(ipInt) || Number.isNaN(netInt)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (netInt & mask);
}

function ipToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return Number.NaN;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export type BlacklistHit = "ip_blocked" | "email_domain_blocked" | "phone_blocked";

export async function checkBlacklists(input: {
  ip: string;
  email: string | null;
  phoneE164: string | null;
}): Promise<BlacklistHit | null> {
  const bl = await prisma.blacklist.findMany({});
  for (const row of bl) {
    if (row.kind === "IP_EXACT" && row.value === input.ip) return "ip_blocked";
    if (row.kind === "IP_CIDR" && ipInCidr(input.ip, row.value)) return "ip_blocked";
    if (
      row.kind === "EMAIL_DOMAIN" &&
      input.email &&
      input.email.toLowerCase().endsWith(`@${row.value.toLowerCase()}`)
    )
      return "email_domain_blocked";
    if (row.kind === "PHONE_E164" && input.phoneE164 === row.value) return "phone_blocked";
  }
  return null;
}
