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

describe("middleware - CSRF enforcement on mutating API routes", () => {
  const SESSION_COOKIE = { "next-auth.session-token": "valid-session" };

  describe("POST requests", () => {
    it("blocks POST /api/deals without CSRF cookie and header", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("CSRF token validation failed");
    });

    it("blocks POST /api/deals with CSRF cookie but no header", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { ...SESSION_COOKIE, csrfToken: "test-csrf-token" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("blocks POST /api/deals with CSRF header but no cookie", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: SESSION_COOKIE,
        headers: { "X-CSRF-Token": "test-csrf-token" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("blocks POST /api/deals with mismatched CSRF tokens", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { ...SESSION_COOKIE, csrfToken: "cookie-token" },
        headers: { "X-CSRF-Token": "header-token" },
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("allows POST /api/deals with matching CSRF tokens", async () => {
      const token = "matching-csrf-token-value";
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { ...SESSION_COOKIE, csrfToken: token },
        headers: { "X-CSRF-Token": token },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("blocks POST without auth even if CSRF tokens match", async () => {
      const token = "matching-csrf-token-value";
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { csrfToken: token },
        headers: { "X-CSRF-Token": token },
      });
      const response = await middleware(req);
      expect(response.status).toBe(401);
    });
  });

  describe("PUT requests", () => {
    it("blocks PUT /api/notifications without CSRF tokens", async () => {
      const req = createMockRequest("/api/notifications", {
        method: "PUT",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("allows PUT /api/notifications with matching CSRF tokens", async () => {
      const token = "put-csrf-token";
      const req = createMockRequest("/api/notifications", {
        method: "PUT",
        cookies: { ...SESSION_COOKIE, csrfToken: token },
        headers: { "X-CSRF-Token": token },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("blocks PUT /api/settings/profile without CSRF tokens", async () => {
      const req = createMockRequest("/api/settings/profile", {
        method: "PUT",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("allows PUT /api/settings/profile with matching CSRF tokens", async () => {
      const token = "settings-csrf";
      const req = createMockRequest("/api/settings/profile", {
        method: "PUT",
        cookies: { ...SESSION_COOKIE, csrfToken: token },
        headers: { "X-CSRF-Token": token },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE requests", () => {
    it("blocks DELETE /api/deals/123 without CSRF tokens", async () => {
      const req = createMockRequest("/api/deals/123", {
        method: "DELETE",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("allows DELETE /api/deals/123 with matching CSRF tokens", async () => {
      const token = "delete-token";
      const req = createMockRequest("/api/deals/123", {
        method: "DELETE",
        cookies: { ...SESSION_COOKIE, csrfToken: token },
        headers: { "X-CSRF-Token": token },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("blocks DELETE /api/integrations/buzzsprout without CSRF", async () => {
      const req = createMockRequest("/api/integrations/buzzsprout", {
        method: "DELETE",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });
  });

  describe("PATCH requests", () => {
    it("blocks PATCH /api/deals/123 without CSRF tokens", async () => {
      const req = createMockRequest("/api/deals/123", {
        method: "PATCH",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(403);
    });

    it("allows PATCH /api/deals/123 with matching CSRF tokens", async () => {
      const token = "patch-csrf-token";
      const req = createMockRequest("/api/deals/123", {
        method: "PATCH",
        cookies: { ...SESSION_COOKIE, csrfToken: token },
        headers: { "X-CSRF-Token": token },
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("GET requests do not require CSRF", () => {
    it("allows GET /api/deals without CSRF token (authenticated)", async () => {
      const req = createMockRequest("/api/deals", {
        method: "GET",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("allows GET /api/dashboard without CSRF token (authenticated)", async () => {
      const req = createMockRequest("/api/dashboard", {
        method: "GET",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("allows GET /api/settings without CSRF token (authenticated)", async () => {
      const req = createMockRequest("/api/settings", {
        method: "GET",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });

  describe("CSRF response body format", () => {
    it("returns JSON with error message on CSRF failure", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      const body = await response.json();
      expect(body).toEqual({ error: "CSRF token validation failed" });
    });

    it("returns application/json content type on CSRF failure", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: SESSION_COOKIE,
      });
      const response = await middleware(req);
      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("public mutating routes bypass CSRF", () => {
    it("allows POST /api/webhooks/stripe without CSRF or auth", async () => {
      const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("allows POST /api/webhooks/inngest without CSRF or auth", async () => {
      const req = createMockRequest("/api/webhooks/inngest", { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("allows POST /api/webhooks/podcast without CSRF or auth", async () => {
      const req = createMockRequest("/api/webhooks/podcast", { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });

    it("allows POST /api/auth/callback/credentials without CSRF check", async () => {
      const req = createMockRequest("/api/auth/callback/credentials", {
        method: "POST",
      });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    });
  });
});

describe("middleware - CSRF cookie setting on page routes", () => {
  it("sets CSRF cookie for authenticated page when no existing cookie", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=");
  });

  it("does not overwrite existing CSRF cookie", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: {
        "next-auth.session-token": "valid",
        csrfToken: "existing-token",
      },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("sets CSRF cookie with correct attributes", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("Path=/");
    expect(setCookie!.toLowerCase()).toContain("samesite=lax");
  });

  it("does not set CSRF cookie for unauthenticated requests (redirected)", async () => {
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - CSRF enforcement priority", () => {
  it("checks auth before CSRF (401 before 403)", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { csrfToken: "some-token" },
      headers: { "X-CSRF-Token": "some-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("checks CSRF after auth passes (403 for missing CSRF)", async () => {
    const req = createMockRequest("/api/deals", {
      method: "POST",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });
});
