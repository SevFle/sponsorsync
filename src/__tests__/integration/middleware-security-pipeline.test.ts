import { describe, it, expect, vi, beforeEach } from "vitest";

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
    searchParams?: Record<string, string>;
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

  const url = new URL(pathname, "http://localhost:3000");
  if (options?.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const headers = new Map<string, string>();
  if (options?.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      headers.set(name, value);
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

describe("middleware - full security pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unauthenticated API request flow", () => {
    it("blocks GET /api/deals → 401", async () => {
      const req = createMockRequest("/api/deals", { method: "GET" });
      const response = await middleware(req);
      expect(response.status).toBe(401);
    });

    it("blocks POST /api/deals → 401 (auth checked before CSRF)", async () => {
      const req = createMockRequest("/api/deals", { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(401);
    });

    it("blocks PUT /api/settings → 401", async () => {
      const req = createMockRequest("/api/settings", { method: "PUT" });
      const response = await middleware(req);
      expect(response.status).toBe(401);
    });

    it("blocks DELETE /api/sponsors/123 → 401", async () => {
      const req = createMockRequest("/api/sponsors/123", { method: "DELETE" });
      const response = await middleware(req);
      expect(response.status).toBe(401);
    });

    it("blocks PATCH /api/deals/456 → 401", async () => {
      const req = createMockRequest("/api/deals/456", { method: "PATCH" });
      const response = await middleware(req);
      expect(response.status).toBe(401);
    });
  });

  describe("authenticated API request without CSRF → 403", () => {
    const SESSION = { "next-auth.session-token": "valid" };

    it("POST /api/deals without CSRF → 403", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: SESSION,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("PUT /api/sponsors/abc without CSRF → 403", async () => {
      const req = createMockRequest("/api/sponsors/abc", {
        method: "PUT",
        cookies: SESSION,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("DELETE /api/templates/t1 without CSRF → 403", async () => {
      const req = createMockRequest("/api/templates/t1", {
        method: "DELETE",
        cookies: SESSION,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("PATCH /api/communications/c1 without CSRF → 403", async () => {
      const req = createMockRequest("/api/communications/c1", {
        method: "PATCH",
        cookies: SESSION,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });
  });

  describe("authenticated API request with valid CSRF → 200", () => {
    const CSRF = "valid-csrf-token-12345";
    const FULL_COOKIES = {
      "next-auth.session-token": "valid",
      csrfToken: CSRF,
    };

    it("POST /api/deals with CSRF → 200", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: FULL_COOKIES,
        headers: { "X-CSRF-Token": CSRF },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("PUT /api/payments/p1 with CSRF → 200", async () => {
      const req = createMockRequest("/api/payments/p1", {
        method: "PUT",
        cookies: FULL_COOKIES,
        headers: { "X-CSRF-Token": CSRF },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("DELETE /api/integrations/i1 with CSRF → 200", async () => {
      const req = createMockRequest("/api/integrations/i1", {
        method: "DELETE",
        cookies: FULL_COOKIES,
        headers: { "X-CSRF-Token": CSRF },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("GET API requests skip CSRF check", () => {
    const SESSION = { "next-auth.session-token": "valid" };

    it("GET /api/dashboard without CSRF → 200", async () => {
      const req = createMockRequest("/api/dashboard", {
        method: "GET",
        cookies: SESSION,
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("GET /api/sponsors without CSRF → 200", async () => {
      const req = createMockRequest("/api/sponsors", {
        method: "GET",
        cookies: SESSION,
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("GET /api/analytics without CSRF → 200", async () => {
      const req = createMockRequest("/api/analytics", {
        method: "GET",
        cookies: SESSION,
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("page redirect flow with CSRF cookie generation", () => {
    const SESSION = { "next-auth.session-token": "valid" };

    it("authenticated /dashboard generates CSRF cookie", async () => {
      const req = createMockRequest("/dashboard", { cookies: SESSION });
      const response = await middleware(req);
      expect(response.status).toBe(200);
      const setCookie = response.headers.get("set-cookie");
      expect(setCookie).toContain("csrfToken=");
      expect(setCookie).toContain("Path=/");
      expect(setCookie!.toLowerCase()).toContain("samesite=lax");
    });

    it("authenticated /dashboard/deals generates CSRF cookie", async () => {
      const req = createMockRequest("/dashboard/deals", { cookies: SESSION });
      const response = await middleware(req);
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toContain("csrfToken=");
    });

    it("authenticated page preserves existing CSRF cookie", async () => {
      const req = createMockRequest("/dashboard", {
        cookies: { ...SESSION, csrfToken: "existing" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("unauthenticated /dashboard redirects to /login with callbackUrl", async () => {
      const req = createMockRequest("/dashboard");
      const response = await middleware(req);
      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      const url = new URL(location);
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("callbackUrl")).toBe("/dashboard");
    });
  });

  describe("login callbackUrl sanitization flow", () => {
    it("/login with safe callbackUrl → 200 (passed through)", async () => {
      const req = createMockRequest("/login", {
        searchParams: { callbackUrl: "/dashboard/deals" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("/login with malicious callbackUrl → 307 redirect to bare /login", async () => {
      const req = createMockRequest("/login", {
        searchParams: { callbackUrl: "https://evil.com" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      const url = new URL(location);
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("callbackUrl")).toBeNull();
    });

    it("/login with javascript: scheme → 307 redirect", async () => {
      const req = createMockRequest("/login", {
        searchParams: { callbackUrl: "javascript:alert(1)" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(307);
    });

    it("/login with empty callbackUrl → 200 (no redirect)", async () => {
      const req = createMockRequest("/login", {
        searchParams: { callbackUrl: "" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("/login without callbackUrl → 200", async () => {
      const req = createMockRequest("/login");
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("public route bypass flow", () => {
    it("/api/auth/signin GET → 200 (no auth, no CSRF)", async () => {
      const req = createMockRequest("/api/auth/signin");
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("/api/auth/callback/google POST → 200 (no auth, no CSRF)", async () => {
      const req = createMockRequest("/api/auth/callback/google", { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("/api/webhooks/stripe POST → 200 (no auth, no CSRF)", async () => {
      const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("/api/health GET → 200", async () => {
      const req = createMockRequest("/api/health");
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("/api/ical/abc123 GET → 200", async () => {
      const req = createMockRequest("/api/ical/abc123");
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("security priority: auth → CSRF", () => {
    it("CSRF tokens present but no session → 401 (auth first)", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { csrfToken: "token" },
        headers: { "X-CSRF-Token": "token" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(401);
    });

    it("session present but no CSRF → 403 (CSRF second)", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { "next-auth.session-token": "valid" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("session + matching CSRF → 200 (both pass)", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { "next-auth.session-token": "valid", csrfToken: "tok" },
        headers: { "X-CSRF-Token": "tok" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("response format validation", () => {
    it("401 returns JSON with error field", async () => {
      const req = createMockRequest("/api/deals");
      const response = await middleware(req);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = await response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("403 returns JSON with CSRF error", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { "next-auth.session-token": "valid" },
      });
      const response = await middleware(req);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = await response.json();
      expect(body).toEqual({ error: "CSRF token validation failed" });
    });

    it("307 redirect has Location header", async () => {
      const req = createMockRequest("/dashboard");
      const response = await middleware(req);
      expect(response.headers.get("location")).toBeTruthy();
      expect(response.status).toBe(307);
    });
  });
});
