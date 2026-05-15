import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(async ({ req }: { req: any }) => {
    const sessionToken =
      req.cookies.get("next-auth.session-token")?.value ??
      req.cookies.get("__Secure-next-auth.session-token")?.value;
    if (!sessionToken) return null;
    return { id: "user-1" };
  }),
}));

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
  it("allows requests to /api/webhooks paths", async () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /api/health", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /login", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /api/auth/signin", async () => {
    const req = createMockRequest("/api/auth/signin");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/ical paths (token-based auth)", async () => {
    const req = createMockRequest("/api/ical/some-token");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows webhook sub-paths", async () => {
    const paths = ["/api/webhooks/inngest", "/api/webhooks/stripe", "/api/webhooks/custom"];
    for (const path of paths) {
      const req = createMockRequest(path, { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    }
  });
});

describe("middleware - API routes require authentication", () => {
  it("blocks /api/deals GET without session token", async () => {
    const req = createMockRequest("/api/deals", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("blocks /api/dashboard GET without session token", async () => {
    const req = createMockRequest("/api/dashboard", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("blocks /api/sponsors GET without session token", async () => {
    const req = createMockRequest("/api/sponsors", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("allows /api/deals GET with valid session token", async () => {
    const req = createMockRequest("/api/deals", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/dashboard GET with valid session token", async () => {
    const req = createMockRequest("/api/dashboard", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/sponsors GET with valid session token", async () => {
    const req = createMockRequest("/api/sponsors", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - API mutating routes CSRF validation", () => {
  it("blocks POST to /api/deals without CSRF token", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks PUT to /api/deals/123 without CSRF token", async () => {
    const req = createMockRequest("/api/deals/123", {
      method: "PUT",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks DELETE to /api/sponsors/456 without CSRF token", async () => {
    const req = createMockRequest("/api/sponsors/456", {
      method: "DELETE",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks PATCH to /api/settings without CSRF token", async () => {
    const req = createMockRequest("/api/settings", {
      method: "PATCH",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST when cookie has token but header is missing", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "my-token", "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST when header has token but cookie is missing", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      headers: { "X-CSRF-Token": "my-token" },
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST when cookie and header tokens differ", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "token-a", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "token-b" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("allows POST when cookie and header tokens match", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows PUT when cookie and header tokens match", async () => {
    const req = createMockRequest("/api/deals/123", {
      method: "PUT",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows DELETE when cookie and header tokens match", async () => {
    const req = createMockRequest("/api/sponsors/456", {
      method: "DELETE",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows PATCH when cookie and header tokens match", async () => {
    const req = createMockRequest("/api/settings", {
      method: "PATCH",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("returns JSON error body on CSRF failure", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    const body = await response.json();
    expect(body.error).toBe("CSRF token validation failed");
  });

  it("returns 401 for mutating API routes without session", async () => {
    const req = createMockRequest("/api/deals", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("does not validate CSRF for public webhook POST routes", async () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not validate CSRF for public auth POST routes", async () => {
    const req = createMockRequest("/api/auth/signin", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not validate CSRF for health routes", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - page route auth checks", () => {
  it("redirects /dashboard to /login without token", async () => {
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows /dashboard with session token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects / (root) to /login without token", async () => {
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows / (root) with session token", async () => {
    const req = createMockRequest("/", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - CSRF cookie generation", () => {
  it("sets csrfToken cookie for authenticated page requests", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });

  it("does not set csrfToken cookie if already present", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: {
        "next-auth.session-token": "valid",
        csrfToken: "existing-token",
      },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("sets csrfToken cookie for authenticated nested page requests", async () => {
    const req = createMockRequest("/dashboard/deals", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });

  it("does not set csrfToken for unauthenticated requests that redirect", async () => {
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("does not set csrfToken for API routes", async () => {
    const req = createMockRequest("/api/deals", { method: "GET" });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("does not set csrfToken for public routes", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("generates unique csrfToken values", async () => {
    const req1 = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const req2 = createMockRequest("/dashboard/deals", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const res1 = await middleware(req1);
    const res2 = await middleware(req2);
    const cookie1 = res1.headers.get("set-cookie")!;
    const cookie2 = res2.headers.get("set-cookie")!;
    const token1 = cookie1.match(/csrfToken=([^;]+)/)?.[1];
    const token2 = cookie2.match(/csrfToken=([^;]+)/)?.[1];
    expect(token1).not.toBe(token2);
  });

  it("sets csrfToken cookie with correct attributes", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie")!;
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("SameSite=lax");
  });
});

describe("middleware - session token variants", () => {
  it("allows /dashboard with __Secure-next-auth.session-token cookie", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("sets csrfToken for __Secure session token users", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });
});
