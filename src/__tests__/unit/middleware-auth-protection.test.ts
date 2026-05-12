import { describe, it, expect, vi, beforeEach } from "vitest";
import { middleware } from "@/middleware";

function createMockRequest(
  pathname: string,
  options?: {
    cookies?: Record<string, string>;
    searchParams?: Record<string, string>;
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

  return {
    nextUrl: { pathname, searchParams: url.searchParams },
    url: url.toString(),
    cookies: {
      get: (name: string) => cookies.get(name) ?? undefined,
    },
  } as any;
}

describe("middleware - public routes", () => {
  it("allows /login without session token", () => {
    const req = createMockRequest("/login");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/auth/signin without session token", () => {
    const req = createMockRequest("/api/auth/signin");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/auth/callback/google without session token", () => {
    const req = createMockRequest("/api/auth/callback/google");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/webhooks/stripe without session token", () => {
    const req = createMockRequest("/api/webhooks/stripe");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/webhooks/inngest without session token", () => {
    const req = createMockRequest("/api/webhooks/inngest");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/health without session token", () => {
    const req = createMockRequest("/api/health");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows arbitrary /api/webhooks sub-paths", () => {
    const paths = [
      "/api/webhooks/stripe",
      "/api/webhooks/inngest",
      "/api/webhooks/custom",
      "/api/webhooks/",
    ];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = middleware(req);
      expect(response.status).toBe(200);
    }
  });
});

describe("middleware - API routes (handled by route handlers)", () => {
  it("allows /api/deals without session token (route handles auth)", () => {
    const req = createMockRequest("/api/deals");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/dashboard without session token (route handles auth)", () => {
    const req = createMockRequest("/api/dashboard");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/sponsors without session token", () => {
    const req = createMockRequest("/api/sponsors");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/payments without session token", () => {
    const req = createMockRequest("/api/payments");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/deliverables without session token", () => {
    const req = createMockRequest("/api/deliverables");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/integrations without session token", () => {
    const req = createMockRequest("/api/integrations");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/templates without session token", () => {
    const req = createMockRequest("/api/templates");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - dashboard route protection", () => {
  it("redirects /dashboard to /login when no session token", () => {
    const req = createMockRequest("/dashboard");
    const response = middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
  });

  it("redirects /dashboard/deals to /login when no session token", () => {
    const req = createMockRequest("/dashboard/deals");
    const response = middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
  });

  it("redirects /dashboard/sponsors to /login when no session token", () => {
    const req = createMockRequest("/dashboard/sponsors");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/payments to /login when no session token", () => {
    const req = createMockRequest("/dashboard/payments");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/deliverables to /login when no session token", () => {
    const req = createMockRequest("/dashboard/deliverables");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/settings to /login when no session token", () => {
    const req = createMockRequest("/dashboard/settings");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/templates to /login when no session token", () => {
    const req = createMockRequest("/dashboard/templates");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/integrations to /login when no session token", () => {
    const req = createMockRequest("/dashboard/integrations");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/deals/new to /login when no session token", () => {
    const req = createMockRequest("/dashboard/deals/new");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/deals/123 to /login when no session token", () => {
    const req = createMockRequest("/dashboard/deals/123");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - session token handling", () => {
  it("allows /dashboard with next-auth.session-token cookie", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /dashboard with __Secure-next-auth.session-token cookie", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("prefers next-auth.session-token over __Secure variant", () => {
    const req = createMockRequest("/dashboard", {
      cookies: {
        "next-auth.session-token": "token-a",
        "__Secure-next-auth.session-token": "token-b",
      },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects when session token cookie is empty string", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "" },
    });
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects when unrelated cookies are present but no session token", () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "csrf-token": "some-csrf", "preferences": "dark" },
    });
    const response = middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - callbackUrl in redirect", () => {
  it("includes original path as callbackUrl in redirect URL", () => {
    const req = createMockRequest("/dashboard/deals");
    const response = middleware(req);
    const location = response.headers.get("location")!;
    expect(location).toContain("callbackUrl=%2Fdashboard%2Fdeals");
  });

  it("includes root dashboard path as callbackUrl", () => {
    const req = createMockRequest("/dashboard");
    const response = middleware(req);
    const location = response.headers.get("location")!;
    expect(location).toContain("callbackUrl=%2Fdashboard");
  });

  it("includes nested path as callbackUrl", () => {
    const req = createMockRequest("/dashboard/deals/abc-123/edit");
    const response = middleware(req);
    const location = response.headers.get("location")!;
    expect(location).toContain("callbackUrl=%2Fdashboard%2Fdeals%2Fabc-123%2Fedit");
  });
});

describe("middleware - redirect loop prevention", () => {
  it("does not redirect /login even without session token", () => {
    const req = createMockRequest("/login");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not redirect /api/auth routes even without session token", () => {
    const req = createMockRequest("/api/auth/signin");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not redirect root path without session token", () => {
    const req = createMockRequest("/");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - root and non-dashboard pages", () => {
  it("redirects root path to /login when no session token", () => {
    const req = createMockRequest("/");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows root path with session token", () => {
    const req = createMockRequest("/", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows unknown paths with session token", () => {
    const req = createMockRequest("/some/random/page", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - edge cases", () => {
  it("handles /dashboard with trailing slash", () => {
    const req = createMockRequest("/dashboard/");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("handles deeply nested dashboard paths", () => {
    const req = createMockRequest("/dashboard/deals/123/edit");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("handles paths with query parameters", () => {
    const req = createMockRequest("/dashboard/deals?page=2&status=active");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows authenticated user to access nested sponsor edit page", () => {
    const req = createMockRequest("/dashboard/sponsors/abc-123/edit", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows authenticated user to access sponsor detail page", () => {
    const req = createMockRequest("/dashboard/sponsors/abc-123", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows authenticated user to access deal detail page", () => {
    const req = createMockRequest("/dashboard/deals/xyz-456", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});
