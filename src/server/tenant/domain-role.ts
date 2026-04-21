/**
 * v2.0 S2.0-2 — hostname → { tenantSlug, domainRole } resolver.
 *
 * Edge-runtime safe: **no Prisma imports**. Pure string parsing.
 *
 * Three domain patterns supported:
 *   - `network.<slug>.<root>`   → dashboard role
 *   - `autologin.<slug>.<root>` → autologin role
 *   - `api.<slug>.<root>`       → api role
 *
 * Plus fallbacks:
 *   - `<ROOT_DOMAIN>` or subdomain-less prod host → `tenant_default` / `network`
 *   - `crm-node.fly.dev` (prod) or `localhost*` (dev) → `tenant_default` / `network`
 *   - any unrecognized host → `tenant_default` / `network` (preserves pre-S2.0-2 behavior).
 *
 * The resolver returns a slug (not a tenantId) because middleware runs in
 * Edge runtime where we cannot hit Prisma; the slug → id resolution happens
 * in the tRPC context / route handlers (Node runtime).
 */
export type DomainRole = "network" | "autologin" | "api";

export interface DomainResolution {
  tenantSlug: string;
  domainRole: DomainRole;
}

const DEFAULT_RESOLUTION: DomainResolution = {
  tenantSlug: "default",
  domainRole: "network",
};

const ROLE_PREFIXES = new Set<string>(["network", "autologin", "api"]);

/**
 * Pure hostname parser. Given a hostname (`host` header or `x-forwarded-host`)
 * and a `ROOT_DOMAIN` env value (like `gambchamp.io` or `gamb.dev`), returns
 * the tenant slug + domain role.
 *
 * Edge-safe — no Node/Prisma imports.
 */
export function resolveDomain(
  hostname: string | null | undefined,
  rootDomain: string | null | undefined,
): DomainResolution {
  if (!hostname) return DEFAULT_RESOLUTION;
  // Strip port (Host header can include `:3000` in dev).
  const host = hostname.toLowerCase().split(":")[0];

  // Local dev (localhost, 127.0.0.1, 0.0.0.0, *.local) → default.
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  ) {
    return DEFAULT_RESOLUTION;
  }

  // Fly-prod fallback: default tenant.
  if (host === "crm-node.fly.dev") return DEFAULT_RESOLUTION;

  // If ROOT_DOMAIN not configured, default every host to network/default.
  const root = rootDomain?.toLowerCase().trim();
  if (!root) return DEFAULT_RESOLUTION;

  // Exact match on the root domain → default tenant.
  if (host === root) return DEFAULT_RESOLUTION;

  // Must end with `.root`.
  if (!host.endsWith(`.${root}`)) return DEFAULT_RESOLUTION;

  // Extract everything BEFORE the root.
  const prefix = host.slice(0, host.length - root.length - 1);
  // `prefix` is now `network.<slug>` / `autologin.<slug>` / `api.<slug>` / `<slug>` (bare).
  const dotIdx = prefix.indexOf(".");
  if (dotIdx === -1) {
    // Bare `<slug>.<root>` — no role prefix → treat as network.
    return { tenantSlug: prefix, domainRole: "network" };
  }

  const rolePart = prefix.slice(0, dotIdx);
  const slugRest = prefix.slice(dotIdx + 1);
  if (!ROLE_PREFIXES.has(rolePart)) {
    // Deeper subdomain we don't recognize — fall back to default.
    return DEFAULT_RESOLUTION;
  }
  // The remaining part must be a flat slug (no more dots) to be valid.
  if (slugRest.includes(".") || slugRest.length === 0) return DEFAULT_RESOLUTION;

  return { tenantSlug: slugRest, domainRole: rolePart as DomainRole };
}

/**
 * Is a given pathname allowed for the given domain role?
 *
 * - `network.*`   → `/dashboard/*`, `/super-admin/*`, `/login`, `/signup`,
 *                    `/pricing`, `/`, `/share/*`, `/docs/*`, `/api/auth/*`,
 *                    `/api/trpc/*`, `/api/telegram/*`. Rejects `/api/v1/*`.
 * - `autologin.*` → `/autologin/*`, `/api/v1/autologin/*`, `/api/auth/*`,
 *                    `/api/v1/health`. Rejects everything else.
 * - `api.*`       → `/api/v1/*`. Rejects everything else.
 */
export function isPathAllowedForRole(pathname: string, role: DomainRole): boolean {
  if (role === "api") {
    // api.* serves only /api/v1/* (+ health always accessible).
    return pathname === "/api/v1/health" || pathname.startsWith("/api/v1/");
  }
  if (role === "autologin") {
    return (
      pathname.startsWith("/autologin") ||
      pathname.startsWith("/api/v1/autologin") ||
      pathname.startsWith("/api/auth") ||
      pathname === "/api/v1/health"
    );
  }
  // network: allow everything EXCEPT /api/v1/* (which belongs to api.*).
  if (pathname.startsWith("/api/v1/")) return false;
  return true;
}
