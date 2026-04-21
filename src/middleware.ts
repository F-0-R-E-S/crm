import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";

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

export default auth((req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

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
    pathname.startsWith("/docs/api") ||
    pathname.startsWith("/api/telegram/") ||
    pathname.startsWith("/share/analytics/") ||
    pathname.startsWith("/api/v1/analytics/share/");

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

  const res = NextResponse.next();
  return withCors(res, req);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
