import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  validateCsrfToken,
  isMutatingMethod,
} from "@/lib/security/csrf";
import { isSafeRedirectUrl } from "@/lib/auth/redirect";

const PUBLIC_PAGE_PATHS = [
  "/login",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
];

const PUBLIC_API_PATHS = [
  "/api/auth",
  "/api/webhooks",
  "/api/health",
  "/api/ical",
];

function isPublicPagePath(pathname: string): boolean {
  return PUBLIC_PAGE_PATHS.some((p) => pathname.startsWith(p));
}

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
}

function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    if (callbackUrl !== null && callbackUrl !== "" && !isSafeRedirectUrl(callbackUrl)) {
      const safeUrl = new URL("/login", request.url);
      return NextResponse.redirect(safeUrl);
    }
    return NextResponse.next();
  }

  if (isPublicPagePath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isMutatingMethod(request.method)) {
      const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
      const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;

      if (!validateCsrfToken(cookieToken, headerToken)) {
        return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
      }
    }

    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  const existingCsrf = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!existingCsrf) {
    setCsrfCookie(response, generateCsrfToken());
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
