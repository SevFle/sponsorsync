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

describe("middleware - public routes", () => {
  it("allows /login without session token", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/auth/signin without session token", async () => {
    const req = createMockRequest("/api/auth/signin");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/auth/callback/google without session token", async () => {
    const req = createMockRequest("/api/auth/callback/google");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/webhooks/stripe without session token", async () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/webhooks/inngest without session token", async () => {
    const req = createMockRequest("/api/webhooks/inngest", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/health without session token", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/ical paths (token-based auth)", async () => {
    const req = createMockRequest("/api/ical/some-token");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows arbitrary /api/webhooks sub-paths", async () => {
    const paths = [
      "/api/webhooks/stripe",
      "/api/webhooks/inngest",
      "/api/webhooks/custom",
      "/api/webhooks/",
    ];
    for (const path of paths) {
      const req = createMockRequest(path, { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    }
  });
});

describe("middleware - API routes require JWT authentication", () => {
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

  it("blocks /api/payments GET without session token", async () => {
    const req = createMockRequest("/api/payments", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("blocks /api/deliverables GET without session token", async () => {
    const req = createMockRequest("/api/deliverables", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("blocks /api/integrations GET without session token", async () => {
    const req = createMockRequest("/api/integrations", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("blocks /api/templates GET without session token", async () => {
    const req = createMockRequest("/api/templates", { method: "GET" });
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
});

describe("middleware - dashboard route protection", () => {
  it("redirects /dashboard to /login when no session token", async () => {
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
  });

  it("redirects /dashboard/deals to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/deals");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
  });

  it("redirects /dashboard/sponsors to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/sponsors");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/payments to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/payments");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/deliverables to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/deliverables");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/settings to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/settings");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/templates to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/templates");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/integrations to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/integrations");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/deals/new to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/deals/new");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects /dashboard/deals/123 to /login when no session token", async () => {
    const req = createMockRequest("/dashboard/deals/123");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - session token handling", () => {
  it("allows /dashboard with next-auth.session-token cookie", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /dashboard with __Secure-next-auth.session-token cookie", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("prefers next-auth.session-token over __Secure variant", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: {
        "next-auth.session-token": "token-a",
        "__Secure-next-auth.session-token": "token-b",
      },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects when session token cookie is empty string", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects when unrelated cookies are present but no session token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "csrf-token": "some-csrf", "preferences": "dark" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - callbackUrl in redirect", () => {
  it("includes original path as callbackUrl in redirect URL", async () => {
    const req = createMockRequest("/dashboard/deals");
    const response = await middleware(req);
    const location = response.headers.get("location")!;
    expect(location).toContain("callbackUrl=%2Fdashboard%2Fdeals");
  });

  it("includes root dashboard path as callbackUrl", async () => {
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    const location = response.headers.get("location")!;
    expect(location).toContain("callbackUrl=%2Fdashboard");
  });

  it("includes nested path as callbackUrl", async () => {
    const req = createMockRequest("/dashboard/deals/abc-123/edit");
    const response = await middleware(req);
    const location = response.headers.get("location")!;
    expect(location).toContain("callbackUrl=%2Fdashboard%2Fdeals%2Fabc-123%2Fedit");
  });
});

describe("middleware - redirect loop prevention", () => {
  it("does not redirect /login even without session token", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not redirect /api/auth routes even without session token", async () => {
    const req = createMockRequest("/api/auth/signin");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("does not redirect root path without session token", async () => {
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - root and non-dashboard pages", () => {
  it("redirects root path to /login when no session token", async () => {
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows root path with session token", async () => {
    const req = createMockRequest("/", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows unknown paths with session token", async () => {
    const req = createMockRequest("/some/random/page", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - edge cases", () => {
  it("handles /dashboard with trailing slash", async () => {
    const req = createMockRequest("/dashboard/");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("handles deeply nested dashboard paths", async () => {
    const req = createMockRequest("/dashboard/deals/123/edit");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("handles paths with query parameters", async () => {
    const req = createMockRequest("/dashboard/deals", {
      searchParams: { page: "2", status: "active" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows authenticated user to access nested sponsor edit page", async () => {
    const req = createMockRequest("/dashboard/sponsors/abc-123/edit", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows authenticated user to access sponsor detail page", async () => {
    const req = createMockRequest("/dashboard/sponsors/abc-123", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows authenticated user to access deal detail page", async () => {
    const req = createMockRequest("/dashboard/deals/xyz-456", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});
