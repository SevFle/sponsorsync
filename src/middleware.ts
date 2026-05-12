import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  generateCsrfToken,
  validateCsrfToken,
  setCsrfCookie,
} from "@/lib/security/csrf";

const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWebhookRoute(pathname: string): boolean {
  return pathname.startsWith("/api/webhooks");
}

function isHealthRoute(pathname: string): boolean {
  return pathname === "/api/health";
}

function isAuthApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/auth");
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isLoginPage(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isCallbackPath(pathname: string): boolean {
  return pathname === "/callback" || pathname.startsWith("/callback/");
}

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some(
    (name) => request.cookies.get(name)?.value
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (isWebhookRoute(pathname)) {
    return NextResponse.next();
  }

  if (isHealthRoute(pathname)) {
    return NextResponse.next();
  }

  if (isAuthApiRoute(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next();

  const existingToken = request.cookies.get("csrfToken")?.value;
  if (!existingToken) {
    const token = generateCsrfToken();
    response = setCsrfCookie(response, token);
  }

  if (isApiRoute(pathname) && MUTATING_METHODS.has(method)) {
    if (!validateCsrfToken(request)) {
      return NextResponse.json(
        { error: "CSRF token validation failed" },
        { status: 403 }
      );
    }
  }

  if (
    !isApiRoute(pathname) &&
    !isLoginPage(pathname) &&
    !isCallbackPath(pathname)
  ) {
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
