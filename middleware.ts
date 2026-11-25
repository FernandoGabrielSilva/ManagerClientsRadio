import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === "https:";
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret, secureCookie });
  const isLoggedIn = !!token;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isCron = req.nextUrl.pathname.startsWith("/api/cron");
  const isPublic =
    isAuthPage ||
    isApiAuth ||
    isCron ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname === "/favicon.ico" ||
    req.nextUrl.pathname === "/robots.txt" ||
    req.nextUrl.pathname === "/sitemap.xml" ||
    req.nextUrl.pathname.startsWith("/sitemap-") ||
    req.nextUrl.pathname === "/privacidade" ||
    req.nextUrl.pathname === "/termos";

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sitemap-|api/auth).*)"],
};
