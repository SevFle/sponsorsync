import { describe, it, expect, vi } from "vitest";
import { middleware } from "@/middleware";
import { NextResponse } from "next/server";

function createMockRequest(
  pathname: string,
  options?: {
    method?: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  }
) {
  const cookieMap = new Map(Object.entries(options?.cookies ?? {}));
  const headers = new Headers(options?.headers ?? {});
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    method: options?.method ?? "GET",
    cookies: {
      get: (name: string) =>
        cookieMap.has(name) ? { value: cookieMap.get(name) } : undefined,
    },
    headers,
  } as any;
}

describe("middleware - exempt routes", () => {
  it("allows requests to /api/webhooks paths", () => {
    const req = createMockRequest("/api/webhooks/stripe");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/health", () => {
    const req = createMockRequest("/api/health");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/auth paths", () => {
    const req = createMockRequest("/api/auth/signin");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows webhook sub-paths", () => {
    const paths = ["/api/webhooks/inngest", "/api/webhooks/stripe", "/api/webhooks/custom"];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = middleware(req);
      expect(response).toBeInstanceOf(NextResponse);
    }
  });
});

describe("middleware - session verification", () => {
  it("redirects to login when no session cookie on protected paths", () => {
    const req = createMockRequest("/deals");
    const response = middleware(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects to login on root path without session", () => {
    const req = createMockRequest("/");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows requests to protected paths with session cookie", () => {
    const req = createMockRequest("/deals", {
      cookies: { "next-auth.session-token": "valid-session" },
    });
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).not.toBe(307);
  });

  it("allows requests with __Secure-next-auth.session-token", () => {
    const req = createMockRequest("/payments", {
      cookies: { "__Secure-next-auth.session-token": "valid-session" },
    });
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).not.toBe(307);
  });

  it("allows requests to /login without session", () => {
    const req = createMockRequest("/login");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).not.toBe(307);
  });

  it("allows requests to /callback without session", () => {
    const req = createMockRequest("/callback");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).not.toBe(307);
  });
});

describe("middleware - CSRF protection", () => {
  it("sets csrfToken cookie when not present", () => {
    const req = createMockRequest("/api/deals", {
      cookies: { "next-auth.session-token": "session" },
    });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });

  it("does not set csrfToken cookie when already present", () => {
    const req = createMockRequest("/api/deals", {
      cookies: {
        "next-auth.session-token": "session",
        csrfToken: "existing-token",
      },
    });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("allows GET API requests without CSRF token", () => {
    const req = createMockRequest("/api/deals", {
      method: "GET",
    });
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).not.toBe(403);
  });

  it("rejects POST API requests without CSRF token", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("rejects POST API requests with mismatched CSRF token", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "cookie-token" },
      headers: { "X-CSRF-Token": "wrong-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("allows POST API requests with valid CSRF token", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "matching-token" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = middleware(req);
    expect(response.status).not.toBe(403);
  });

  it("rejects PATCH API requests without CSRF token", () => {
    const req = createMockRequest("/api/deals/123", {
      method: "PATCH",
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("rejects DELETE API requests without CSRF token", () => {
    const req = createMockRequest("/api/deals/123", {
      method: "DELETE",
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("allows POST to /api/auth without CSRF check", () => {
    const req = createMockRequest("/api/auth/signin", {
      method: "POST",
    });
    const response = middleware(req);
    expect(response.status).not.toBe(403);
  });

  it("allows POST to /api/webhooks without CSRF check", () => {
    const req = createMockRequest("/api/webhooks/stripe", {
      method: "POST",
    });
    const response = middleware(req);
    expect(response.status).not.toBe(403);
  });
});
