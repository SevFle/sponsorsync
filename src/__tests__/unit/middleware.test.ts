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

const SAFE_PATH_RE = /^\/[a-zA-Z0-9_][a-zA-Z0-9\-._~\/?=%&+ :@]*$|^\/$/;

function createMockRequest(
  pathname: string,
  options?: {
    cookies?: Record<string, string>;
    method?: string;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
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

  const url = new URL(pathname, "http://localhost:3000");
  if (options?.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return {
    nextUrl: { pathname, searchParams: url.searchParams },
    url: url.toString(),
    method: options?.method ?? "GET",
    cookies: {
      get: (name: string) => cookies.get(name) ?? undefined,
    },
    headers: {
      get: (name: string) => headers.get(name) ?? null,
    },
  } as any;
}

function extractCallbackUrl(location: string): string | null {
  const url = new URL(location);
  const raw = url.searchParams.get("callbackUrl");
  return raw;
}

describe("middleware - public routes", () => {
  it("allows /api/webhooks/stripe POST", async () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/health GET", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /login GET", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/auth/signin GET", async () => {
    const req = createMockRequest("/api/auth/signin");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/ical paths", async () => {
    const req = createMockRequest("/api/ical/some-token");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows all webhook sub-paths without auth", async () => {
    const paths = ["/api/webhooks/inngest", "/api/webhooks/stripe", "/api/webhooks/custom"];
    for (const path of paths) {
      const req = createMockRequest(path, { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    }
  });
});

describe("middleware - API routes require authentication", () => {
  it("blocks /api/deals GET without session", async () => {
    const req = createMockRequest("/api/deals", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("blocks /api/dashboard GET without session", async () => {
    const req = createMockRequest("/api/dashboard", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("blocks /api/sponsors GET without session", async () => {
    const req = createMockRequest("/api/sponsors", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("allows /api/deals GET with valid session", async () => {
    const req = createMockRequest("/api/deals", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/dashboard GET with valid session", async () => {
    const req = createMockRequest("/api/dashboard", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/sponsors GET with valid session", async () => {
    const req = createMockRequest("/api/sponsors", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - CSRF validation on mutating methods", () => {
  it("blocks POST without CSRF token (403)", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("CSRF");
  });

  it("blocks PUT without CSRF token (403)", async () => {
    const req = createMockRequest("/api/deals/123", {
      method: "PUT",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks DELETE without CSRF token (403)", async () => {
    const req = createMockRequest("/api/sponsors/456", {
      method: "DELETE",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks PATCH without CSRF token (403)", async () => {
    const req = createMockRequest("/api/settings", {
      method: "PATCH",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST with cookie token but missing header", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "my-token", "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST with header token but missing cookie", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      headers: { "X-CSRF-Token": "my-token" },
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST with mismatched cookie/header tokens", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "token-a", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "token-b" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("allows POST with matching cookie and header tokens", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows PUT with matching cookie and header tokens", async () => {
    const req = createMockRequest("/api/deals/123", {
      method: "PUT",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows DELETE with matching tokens", async () => {
    const req = createMockRequest("/api/sponsors/456", {
      method: "DELETE",
      cookies: { csrfToken: "matching-token", "next-auth.session-token": "valid" },
      headers: { "X-CSRF-Token": "matching-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows PATCH with matching tokens", async () => {
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

  it("returns 401 for mutating API routes without session (auth checked first)", async () => {
    const req = createMockRequest("/api/deals", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("skips CSRF check for public webhook POST routes", async () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("skips CSRF check for public auth POST routes", async () => {
    const req = createMockRequest("/api/auth/signin", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("skips CSRF check for health routes", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - page route auth and redirect", () => {
  it("redirects /dashboard to /login without token", async () => {
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    const callbackUrl = extractCallbackUrl(location);
    expect(callbackUrl).toBe("/dashboard");
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  it("allows /dashboard with session token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects / to /login without token", async () => {
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows / with session token", async () => {
    const req = createMockRequest("/", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirect location callbackUrl is always a safe relative path", async () => {
    const paths = ["/dashboard", "/dashboard/deals", "/dashboard/settings/billing"];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = await middleware(req);
      const location = response.headers.get("location")!;
      const callbackUrl = extractCallbackUrl(location);
      expect(callbackUrl).not.toBeNull();
      expect(callbackUrl).toMatch(SAFE_PATH_RE);
    }
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

  it("does not set csrfToken if already present", async () => {
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

  it("sets csrfToken for nested authenticated pages", async () => {
    const req = createMockRequest("/dashboard/deals", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });

  it("does not set csrfToken for redirect responses", async () => {
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

  it("generates unique csrfToken values per request", async () => {
    const req1 = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const req2 = createMockRequest("/dashboard/deals", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const res1 = await middleware(req1);
    const res2 = await middleware(req2);
    const token1 = res1.headers.get("set-cookie")!.match(/csrfToken=([^;]+)/)?.[1];
    const token2 = res2.headers.get("set-cookie")!.match(/csrfToken=([^;]+)/)?.[1];
    expect(token1).not.toBe(token2);
  });

  it("sets csrfToken with Path=/ and SameSite=lax", async () => {
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
  it("recognizes __Secure-next-auth.session-token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("sets csrfToken for __Secure session token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });
});

describe("middleware - callbackUrl sanitization on /login", () => {
  describe("safe callbackUrl values are passed through", () => {
    const safeCases: [string, string][] = [
      ["/dashboard", "simple path"],
      ["/dashboard/deals", "nested path"],
      ["/", "root path"],
    ];

    for (const [callbackUrl, label] of safeCases) {
      it(`passes through safe ${label}: "${callbackUrl}"`, async () => {
        const req = createMockRequest("/login", {
          searchParams: { callbackUrl },
        });
        const response = await middleware(req);
        expect(response.status).toBe(200);
      });
    }
  });

  describe("unsafe callbackUrl values are stripped — redirect to bare /login", () => {
    const unsafeCases: [string, string][] = [
      ["https://evil.com", "https external"],
      ["//evil.com/phish", "protocol-relative"],
      ["javascript:alert(1)", "javascript scheme"],
      ["data:text/html,<script>alert(1)</script>", "data scheme"],
      ["ftp://evil.com", "ftp scheme"],
      ["///evil.com", "triple-slash"],
      ["HTTPS://EVIL.COM", "uppercase external"],
      ["https://evil.com/dashboard", "external with safe-looking path"],
      ["https://evil.com/", "external with trailing slash"],
      ["https://evil.com?redirect=/safe", "external with query"],
    ];

    for (const [callbackUrl, label] of unsafeCases) {
      it(`strips unsafe ${label} and redirects to bare /login`, async () => {
        const req = createMockRequest("/login", {
          searchParams: { callbackUrl },
        });
        const response = await middleware(req);
        expect(response.status).toBe(307);
        const location = response.headers.get("location")!;
        const redirectUrl = new URL(location);
        expect(redirectUrl.pathname).toBe("/login");
        const sanitizedCallback = redirectUrl.searchParams.get("callbackUrl");
        expect(sanitizedCallback).toBeNull();
      });
    }
  });

  it("allows /login with empty callbackUrl", async () => {
    const req = createMockRequest("/login", {
      searchParams: { callbackUrl: "" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});
