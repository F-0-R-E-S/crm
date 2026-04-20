import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/v1/health") ||
    pathname.startsWith("/api/v1/leads") ||
    pathname.startsWith("/api/v1/postbacks/") ||
    pathname.startsWith("/api/v1/errors") ||
    pathname.startsWith("/api/v1/schema/") ||
    pathname.startsWith("/api/v1/openapi") ||
    pathname.startsWith("/docs/api");
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
