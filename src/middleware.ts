import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  validateCsrfToken,
  isMutatingMethod,
} from "@/lib/security/csrf";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
  "/api/billing",
];

const SUBSCRIPTION_ALLOWED_PATHS = [
  "/dashboard/settings/billing",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isSubscriptionAllowedPath(pathname: string): boolean {
  return SUBSCRIPTION_ALLOWED_PATHS.some((p) => pathname.startsWith(p));
}

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get("next-auth.session-token")?.value ??
    request.cookies.get("__Secure-next-auth.session-token")?.value
  );
}

function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (isMutatingMethod(request.method)) {
      const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
      const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;

      if (!validateCsrfToken(cookieToken, headerToken)) {
        return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  const token = getSessionToken(request);

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isSubscriptionAllowedPath(pathname)) {
    const response = NextResponse.next();
    const existingCsrf = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    if (!existingCsrf) {
      setCsrfCookie(response, generateCsrfToken());
    }
    return response;
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
