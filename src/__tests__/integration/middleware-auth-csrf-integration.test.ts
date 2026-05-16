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

describe("Middleware integration - complete auth + CSRF flow", () => {
  describe("full request lifecycle: unauthenticated user", () => {
    it("redirects to login for page routes", async () => {
      const paths = ["/dashboard", "/dashboard/deals", "/dashboard/settings"];
      for (const path of paths) {
        const req = createMockRequest(path);
        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location")!;
        expect(location).toContain("/login");
        expect(location).toContain("callbackUrl=");
      }
    });

    it("returns 401 JSON for API routes", async () => {
      const endpoints = [
        { method: "GET", path: "/api/deals" },
        { method: "POST", path: "/api/deals" },
        { method: "GET", path: "/api/dashboard" },
        { method: "GET", path: "/api/integrations" },
        { method: "PUT", path: "/api/settings" },
        { method: "DELETE", path: "/api/deals/123" },
      ];
      for (const { method, path } of endpoints) {
        const req = createMockRequest(path, { method });
        const res = await middleware(req);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe("Unauthorized");
      }
    });

    it("allows public routes", async () => {
      const publicPaths = ["/login", "/api/auth/signin", "/api/health"];
      for (const path of publicPaths) {
        const req = createMockRequest(path);
        const res = await middleware(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe("full request lifecycle: authenticated user with CSRF", () => {
    const AUTH = { "next-auth.session-token": "valid-session" };

    it("allows page routes and sets CSRF cookie", async () => {
      const req = createMockRequest("/dashboard", { cookies: AUTH });
      const res = await middleware(req);
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("csrfToken=");
    });

    it("allows GET API routes without CSRF", async () => {
      const getRoutes = [
        "/api/deals",
        "/api/dashboard",
        "/api/settings",
        "/api/integrations",
        "/api/notifications",
      ];
      for (const path of getRoutes) {
        const req = createMockRequest(path, { cookies: AUTH });
        const res = await middleware(req);
        expect(res.status).toBe(200);
      }
    });

    it("blocks mutating API routes without CSRF", async () => {
      const mutatingRoutes = [
        { method: "POST", path: "/api/deals" },
        { method: "PUT", path: "/api/notifications" },
        { method: "DELETE", path: "/api/deals/123" },
        { method: "PATCH", path: "/api/sponsors/abc" },
      ];
      for (const { method, path } of mutatingRoutes) {
        const req = createMockRequest(path, { method, cookies: AUTH });
        const res = await middleware(req);
        expect(res.status).toBe(403);
      }
    });

    it("allows mutating API routes with valid CSRF", async () => {
      const csrf = "valid-csrf-token-for-test";
      const mutatingRoutes = [
        { method: "POST", path: "/api/deals" },
        { method: "PUT", path: "/api/settings" },
        { method: "DELETE", path: "/api/sponsors/xyz" },
        { method: "PATCH", path: "/api/deliverables/abc" },
      ];
      for (const { method, path } of mutatingRoutes) {
        const req = createMockRequest(path, {
          method,
          cookies: { ...AUTH, csrfToken: csrf },
          headers: { "X-CSRF-Token": csrf },
        });
        const res = await middleware(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe("edge cases: concurrent CSRF and auth scenarios", () => {
    it("expired session + valid CSRF returns 401 not 403", async () => {
      const csrf = "valid-csrf";
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: { csrfToken: csrf },
        headers: { "X-CSRF-Token": csrf },
      });
      const res = await middleware(req);
      expect(res.status).toBe(401);
    });

    it("valid session + expired CSRF returns 403", async () => {
      const req = createMockRequest("/api/deals", {
        method: "POST",
        cookies: {
          "next-auth.session-token": "valid",
          csrfToken: "old-csrf",
        },
        headers: { "X-CSRF-Token": "new-csrf" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("HEAD requests bypass CSRF (non-mutating)", async () => {
      const req = createMockRequest("/api/deals", {
        method: "HEAD",
        cookies: { "next-auth.session-token": "valid" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it("OPTIONS requests bypass CSRF (non-mutating)", async () => {
      const req = createMockRequest("/api/deals", {
        method: "OPTIONS",
        cookies: { "next-auth.session-token": "valid" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });

  describe("callbackUrl preservation across redirects", () => {
    it("preserves exact path in callbackUrl", async () => {
      const paths = [
        "/dashboard",
        "/dashboard/deals",
        "/dashboard/deals/new",
        "/dashboard/settings/billing",
        "/dashboard/integrations",
      ];
      for (const path of paths) {
        const req = createMockRequest(path);
        const res = await middleware(req);
        const location = res.headers.get("location")!;
        const url = new URL(location);
        expect(url.searchParams.get("callbackUrl")).toBe(path);
      }
    });
  });

  describe("public API webhook paths with various methods", () => {
    it("allows all methods on /api/webhooks without auth/CSRF", async () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      const paths = ["/api/webhooks/stripe", "/api/webhooks/inngest", "/api/webhooks/podcast"];

      for (const path of paths) {
        for (const method of methods) {
          const req = createMockRequest(path, { method });
          const res = await middleware(req);
          expect(res.status).toBe(200);
        }
      }
    });
  });

  describe("health endpoint accessibility", () => {
    it("allows GET /api/health without auth", async () => {
      const req = createMockRequest("/api/health");
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it("allows POST /api/health without auth (still public path)", async () => {
      const req = createMockRequest("/api/health", { method: "POST" });
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });

  describe("ical route accessibility (token-based auth)", () => {
    it("allows GET /api/ical/abc-123 without session", async () => {
      const req = createMockRequest("/api/ical/abc-123");
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it("allows GET /api/ical with long token without session", async () => {
      const req = createMockRequest("/api/ical/some-very-long-token-string-here");
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });
});
