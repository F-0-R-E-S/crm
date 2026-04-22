import { auth } from "@/auth";
import { isPathAllowedForRole, resolveDomain } from "@/server/tenant/domain-role";
import { type NextRequest, NextResponse } from "next/server";

const CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "authorization, content-type, x-idempotency-key, x-api-version";

function allowedOrigins(): string[] {
  const raw = process.env.GAME_ORIGIN ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isGameApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/v1/") || pathname.startsWith("/api/trpc/");
}

function corsHeadersFor(origin: string | null): Headers {
  const h = new Headers();
  if (origin && allowedOrigins().includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
    h.set("Access-Control-Allow-Methods", CORS_METHODS);
    h.set("Access-Control-Allow-Headers", CORS_HEADERS);
    h.set("Access-Control-Max-Age", "600");
  }
  return h;
}

function handlePreflight(req: NextRequest): NextResponse | null {
  if (req.method !== "OPTIONS") return null;
  if (!isGameApiPath(req.nextUrl.pathname)) return null;
  const origin = req.headers.get("origin");
  const h = corsHeadersFor(origin);
  return new NextResponse(null, { status: 204, headers: h });
}

function withCors(res: NextResponse, req: NextRequest): NextResponse {
  if (!isGameApiPath(req.nextUrl.pathname)) return res;
  const origin = req.headers.get("origin");
  const h = corsHeadersFor(origin);
  h.forEach((v, k) => res.headers.set(k, v));
  return res;
}

/**
 * v2.0 S2.0-2 — extract the hostname from `x-forwarded-host` (fly) or `host`.
 */
function resolveHostname(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.hostname ?? null
  );
}

export default auth((req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // v2.0 S2.0-2 — resolve tenant from hostname + enforce domain-role gating.
  const rootDomain = process.env.ROOT_DOMAIN ?? "";
  const hostname = resolveHostname(req);
  const { tenantSlug, domainRole } = resolveDomain(hostname, rootDomain);

  // Domain-role path gating — a request to `api.acme.gambchamp.io/dashboard`
  // returns 404 even before auth runs (hides tenant surface).
  // Health endpoint is always allowed (for k8s / fly probes).
  const isHealthProbe = pathname === "/api/v1/health";
  if (!isHealthProbe && !isPathAllowedForRole(pathname, domainRole)) {
    return new NextResponse(null, { status: 404 });
  }

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/v1/auth/operator-token") ||
    pathname.startsWith("/api/v1/health") ||
    pathname.startsWith("/api/v1/leads") ||
    pathname.startsWith("/api/v1/postbacks/") ||
    pathname.startsWith("/api/v1/errors") ||
    pathname.startsWith("/api/v1/schema/") ||
    pathname.startsWith("/api/v1/openapi") ||
    pathname.startsWith("/docs/") ||
    pathname === "/docs" ||
    pathname.startsWith("/api/telegram/") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/docs/") ||
    pathname.startsWith("/share/analytics/") ||
    pathname.startsWith("/api/v1/analytics/share/") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt";

  // Bearer tokens are allowed to reach any /api/v1/* or /api/trpc/* — the
  // route handlers are responsible for verifying them. The redirect-to-login
  // only fires for page routes, not API routes under the CORS matchers.
  if (!isLoggedIn && !isPublic && !isGameApiPath(pathname)) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Propagate tenant-slug + domain-role to downstream handlers. Never trust
  // client-supplied values — strip any existing headers before setting ours.
  const reqHeaders = new Headers(req.headers);
  reqHeaders.delete("x-tenant-slug");
  reqHeaders.delete("x-tenant-domain-role");
  reqHeaders.set("x-tenant-slug", tenantSlug);
  reqHeaders.set("x-tenant-domain-role", domainRole);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  return withCors(res, req);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
