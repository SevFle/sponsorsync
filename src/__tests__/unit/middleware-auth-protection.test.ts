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

function extractCallbackUrl(location: string): string | null {
  return new URL(location).searchParams.get("callbackUrl");
}

describe("middleware - public routes access", () => {
  it("allows /login without session", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/auth/signin without session", async () => {
    const req = createMockRequest("/api/auth/signin");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/auth/callback/google without session", async () => {
    const req = createMockRequest("/api/auth/callback/google");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/webhooks/stripe POST without session", async () => {
    const req = createMockRequest("/api/webhooks/stripe", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/webhooks/inngest POST without session", async () => {
    const req = createMockRequest("/api/webhooks/inngest", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/health without session", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/ical paths", async () => {
    const req = createMockRequest("/api/ical/some-token");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows arbitrary /api/webhooks sub-paths", async () => {
    const paths = ["/api/webhooks/stripe", "/api/webhooks/inngest", "/api/webhooks/custom", "/api/webhooks/"];
    for (const path of paths) {
      const req = createMockRequest(path, { method: "POST" });
      const response = await middleware(req);
      expect(response.status).toBe(200);
    }
  });
});

describe("middleware - API auth required", () => {
  const protectedPaths = [
    "/api/deals",
    "/api/dashboard",
    "/api/sponsors",
    "/api/payments",
    "/api/deliverables",
    "/api/integrations",
    "/api/templates",
  ];

  for (const path of protectedPaths) {
    it(`blocks ${path} GET without session`, async () => {
      const req = createMockRequest(path, { method: "GET" });
      const response = await middleware(req);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  }

  it("allows /api/deals GET with session", async () => {
    const req = createMockRequest("/api/deals", {
      method: "GET",
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - dashboard redirect with safe callbackUrl", () => {
  const dashboardPaths = [
    "/dashboard",
    "/dashboard/deals",
    "/dashboard/sponsors",
    "/dashboard/payments",
    "/dashboard/deliverables",
    "/dashboard/settings",
    "/dashboard/templates",
    "/dashboard/integrations",
    "/dashboard/deals/new",
    "/dashboard/deals/123",
    "/dashboard/settings/billing",
  ];

  for (const path of dashboardPaths) {
    it(`redirects ${path} to /login with safe callbackUrl`, async () => {
      const req = createMockRequest(path);
      const response = await middleware(req);
      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      const callbackUrl = extractCallbackUrl(location);
      expect(callbackUrl).not.toBeNull();
      expect(callbackUrl).toMatch(SAFE_PATH_RE);
      expect(callbackUrl).toBe(path);
    });
  }
});

describe("middleware - session token handling", () => {
  it("allows /dashboard with next-auth.session-token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /dashboard with __Secure-next-auth.session-token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "__Secure-next-auth.session-token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("works with both session token variants present", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: {
        "next-auth.session-token": "token-a",
        "__Secure-next-auth.session-token": "token-b",
      },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects when session token is empty string", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("redirects with unrelated cookies but no session token", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "csrf-token": "some-csrf", "preferences": "dark" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });
});

describe("middleware - redirect loop prevention", () => {
  it("never redirects /login", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("never redirects /api/auth routes", async () => {
    const req = createMockRequest("/api/auth/signin");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects / without session to /login", async () => {
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    const callbackUrl = extractCallbackUrl(location);
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });
});

describe("middleware - edge cases", () => {
  it("handles /dashboard/ with trailing slash", async () => {
    const req = createMockRequest("/dashboard/");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    const callbackUrl = extractCallbackUrl(location);
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  it("handles deeply nested dashboard paths", async () => {
    const req = createMockRequest("/dashboard/deals/123/edit");
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    const callbackUrl = extractCallbackUrl(location);
    expect(callbackUrl).toBe("/dashboard/deals/123/edit");
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  it("handles paths with query parameters", async () => {
    const req = createMockRequest("/dashboard/deals", {
      searchParams: { page: "2", status: "active" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    const callbackUrl = extractCallbackUrl(location);
    expect(callbackUrl).toMatch(SAFE_PATH_RE);
  });

  it("allows authenticated user to nested sponsor edit page", async () => {
    const req = createMockRequest("/dashboard/sponsors/abc-123/edit", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows authenticated user to sponsor detail page", async () => {
    const req = createMockRequest("/dashboard/sponsors/abc-123", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows authenticated user to deal detail page", async () => {
    const req = createMockRequest("/dashboard/deals/xyz-456", {
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
