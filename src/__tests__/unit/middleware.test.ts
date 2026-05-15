import { describe, it, expect } from "vitest";
import { middleware } from "@/middleware";

function createMockRequest(
  pathname: string,
  options?: {
    cookies?: Record<string, string>;
    method?: string;
    headers?: Record<string, string>;
  }
) {
  const cookies = new Map<string, { name: string; value: string }>();
  if (options?.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      cookies.set(name, { name, value });
    }
  }

  const headers = new Map<string, string>();
  if (options?.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      headers.set(name, value);
    }
  }

  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    method: options?.method ?? "GET",
    cookies: {
      get: (name: string) => cookies.get(name) ?? undefined,
    },
    headers: {
      get: (name: string) => headers.get(name) ?? null,
    },
  } as any;
}

describe("middleware - public routes", () => {
  it("allows requests to /api/webhooks paths", () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /api/health", () => {
    const req = createMockRequest("/api/health");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /login", () => {
    const req = createMockRequest("/login");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /api/auth/signin", () => {
    const req = createMockRequest("/api/auth/signin");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows webhook sub-paths", () => {
    const paths = ["/api/webhooks/inngest", "/api/webhooks/stripe", "/api/webhooks/custom"];
    for (const path of paths) {
      const req = createMockRequest(path, { method: "POST" });
      const response = middleware(req);
      expect(response.status).toBe(200);
    }
  });
});

describe("middleware - API GET routes pass through", () => {
  it("allows /api/deals GET with session token (no CSRF needed)", () => {
    const req = createMockRequest("/api/deals", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/dashboard GET with session token", () => {
    const req = createMockRequest("/api/dashboard", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/sponsors GET with session token", () => {
    const req = createMockRequest("/api/sponsors", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/deals GET without session token (API routes defer auth to handler)", () => {
    const req = createMockRequest("/api/deals", { method: "GET" });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/dashboard GET without session token (API routes defer auth to handler)", () => {
    const req = createMockRequest("/api/dashboard", { method: "GET" });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - API mutating routes CSRF validation", () => {
  it("blocks POST to /api/deals without CSRF token", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks PUT to /api/deals/123 without CSRF token", () => {
    const req = createMockRequest("/api/deals/123", {
      method: "PUT",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks DELETE to /api/sponsors/456 without CSRF token", () => {
    const req = createMockRequest("/api/sponsors/456", {
      method: "DELETE",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks PATCH to /api/settings without CSRF token", () => {
    const req = createMockRequest("/api/settings", {
      method: "PATCH",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST when cookie has token but header is missing", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "my-token", "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST when header has token but cookie is missing", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      headers: { "X-CSRF-Token": "my-token" },
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST when cookie and header tokens differ", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "token-a", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "token-b" },
    });
    const response = middleware(req);
    expect(response.status).toBe(403);
  });

  it("allows POST when cookie and header tokens match", () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows PUT when cookie and header tokens match", () => {
    const req = createMockRequest("/api/deals/123", {
      method: "PUT",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows DELETE when cookie and header tokens match", () => {
    const req = createMockRequest("/api/sponsors/456", {
      method: "DELETE",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows PATCH when cookie and header tokens match", () => {
    const req = createMockRequest("/api/settings", {
      method: "PATCH",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("returns JSON error body on CSRF failure", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    const body = await response.json();
    expect(body.error).toBe("CSRF token validation failed");
  });

  it("does not validate session on API routes (auth handled by route handlers)", () => {
    const req = createMockRequest("/api/deals", { method: "GET" });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not validate CSRF for public webhook POST routes", () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not validate CSRF for public auth POST routes", () => {
    const req = createMockRequest("/api/auth/signin", { method: "POST" });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not validate CSRF for health routes", () => {
    const req = createMockRequest("/api/health");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - page route auth checks", () => {
  it("redirects /dashboard to /login without token", () => {
    const req = createMockRequest("/dashboard");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows /dashboard with session token", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects / (root) to /login without token", () => {
    const req = createMockRequest("/");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows / (root) with session token", () => {
    const req = createMockRequest("/", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - CSRF cookie generation", () => {
  it("sets csrfToken cookie for authenticated page requests", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });

  it("does not set csrfToken cookie if already present", () => {
    const req = createMockRequest("/dashboard", {
      cookies: {
        "next-auth.session-token": "valid",
        csrfToken: "existing-token",
      },
    });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("sets csrfToken cookie for authenticated nested page requests", () => {
    const req = createMockRequest("/dashboard/deals", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });

  it("does not set csrfToken for unauthenticated requests that redirect", () => {
    const req = createMockRequest("/dashboard");
    const response = middleware(req);
    expect(response.status).toBe(307);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("does not set csrfToken for API routes", () => {
    const req = createMockRequest("/api/deals", { method: "GET" });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("does not set csrfToken for public routes", () => {
    const req = createMockRequest("/login");
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("generates unique csrfToken values", () => {
    const req1 = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const req2 = createMockRequest("/dashboard/deals", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const res1 = middleware(req1);
    const res2 = middleware(req2);
    const cookie1 = res1.headers.get("set-cookie")!;
    const cookie2 = res2.headers.get("set-cookie")!;
    const token1 = cookie1.match(/csrfToken=([^;]+)/)?.[1];
    const token2 = cookie2.match(/csrfToken=([^;]+)/)?.[1];
    expect(token1).not.toBe(token2);
  });

  it("sets csrfToken cookie with correct attributes", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie")!;
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("SameSite=lax");
  });
});

describe("middleware - session token variants", () => {
  it("allows /dashboard with __Secure-next-auth.session-token cookie", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("sets csrfToken for __Secure session token users", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });
});
