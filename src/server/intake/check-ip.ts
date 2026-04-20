import IPCIDR from "ip-cidr";

export function clientIpAllowed(clientIp: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  for (const rule of allowed) {
    if (rule === clientIp) return true;
    if (rule.includes("/")) {
      try {
        const cidr = new IPCIDR(rule);
        if (cidr.contains(clientIp)) return true;
      } catch {
        // invalid CIDR — skip
      }
    }
  }
  return false;
}

export function extractClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}
