import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  generateCsrf: vi.fn(() => "mock-csrf-token-abcdef1234567890abcdef1234567890"),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: mocks.getToken,
}));

vi.mock("@/lib/security/csrf", async () => {
  const actual = await vi.importActual("@/lib/security/csrf");
  return {
    ...actual,
    generateCsrfToken: mocks.generateCsrf,
  };
});

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getToken.mockResolvedValue({ id: "user-1" });
  mocks.generateCsrf.mockReturnValue("mock-csrf-token-abcdef1234567890abcdef1234567890");
});

describe("middleware - CSRF enforcement on notification API routes", () => {
  it("allows GET /api/notifications without CSRF token", async () => {
    const req = createMockRequest("/api/notifications", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows GET /api/settings/notifications without CSRF token", async () => {
    const req = createMockRequest("/api/settings/notifications", { method: "GET" });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("blocks PUT /api/notifications without CSRF cookie", async () => {
    const req = createMockRequest("/api/notifications", {
      method: "PUT",
      headers: { "X-CSRF-Token": "some-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("CSRF token validation failed");
  });

  it("blocks PUT /api/notifications without CSRF header", async () => {
    const req = createMockRequest("/api/notifications", {
      method: "PUT",
      cookies: { csrfToken: "some-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks PUT /api/notifications with mismatched CSRF tokens", async () => {
    const req = createMockRequest("/api/notifications", {
      method: "PUT",
      cookies: { csrfToken: "cookie-token" },
      headers: { "X-CSRF-Token": "header-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("allows PUT /api/notifications with valid CSRF double-submit", async () => {
    const req = createMockRequest("/api/notifications", {
      method: "PUT",
      cookies: { csrfToken: "valid-token" },
      headers: { "X-CSRF-Token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("blocks PUT /api/settings/notifications without CSRF", async () => {
    const req = createMockRequest("/api/settings/notifications", {
      method: "PUT",
    });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("allows PUT /api/settings/notifications with valid CSRF", async () => {
    const req = createMockRequest("/api/settings/notifications", {
      method: "PUT",
      cookies: { csrfToken: "valid-token" },
      headers: { "X-CSRF-Token": "valid-token" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("blocks POST /api/notifications without CSRF", async () => {
    const req = createMockRequest("/api/notifications", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks DELETE /api/notifications without CSRF", async () => {
    const req = createMockRequest("/api/notifications", { method: "DELETE" });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks PATCH /api/notifications without CSRF", async () => {
    const req = createMockRequest("/api/notifications", { method: "PATCH" });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });
});

describe("middleware - CSRF enforcement on other protected API routes", () => {
  it("blocks PUT /api/deals without CSRF", async () => {
    const req = createMockRequest("/api/deals", { method: "PUT" });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST /api/sponsors without CSRF", async () => {
    const req = createMockRequest("/api/sponsors", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST /api/payments without CSRF", async () => {
    const req = createMockRequest("/api/payments", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("blocks POST /api/settings without CSRF", async () => {
    const req = createMockRequest("/api/settings", { method: "POST" });
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });
});

describe("middleware - notification routes auth check", () => {
  it("returns 401 for GET /api/notifications without session", async () => {
    mocks.getToken.mockResolvedValue(null);
    const req = createMockRequest("/api/notifications");
    const response = await middleware(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 for PUT /api/notifications without session", async () => {
    mocks.getToken.mockResolvedValue(null);
    const req = createMockRequest("/api/notifications", { method: "PUT" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("returns 401 for GET /api/settings/notifications without session", async () => {
    mocks.getToken.mockResolvedValue(null);
    const req = createMockRequest("/api/settings/notifications");
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });

  it("returns 401 for PUT /api/settings/notifications without session", async () => {
    mocks.getToken.mockResolvedValue(null);
    const req = createMockRequest("/api/settings/notifications", { method: "PUT" });
    const response = await middleware(req);
    expect(response.status).toBe(401);
  });
});

describe("middleware - CSRF cookie seeding for authenticated pages", () => {
  it("sets CSRF cookie on /dashboard when none exists", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
    expect(mocks.generateCsrf).toHaveBeenCalled();
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toContain("csrfToken=");
  });

  it("does not regenerate CSRF cookie when one already exists", async () => {
    const req = createMockRequest("/dashboard", {
      cookies: {
        "next-auth.session-token": "valid",
        csrfToken: "existing-token",
      },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
    expect(mocks.generateCsrf).not.toHaveBeenCalled();
  });

  it("sets CSRF cookie on /dashboard/notifications when none exists", async () => {
    const req = createMockRequest("/dashboard/settings/notifications", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
    expect(mocks.generateCsrf).toHaveBeenCalled();
  });

  it("sets CSRF cookie on deeply nested dashboard paths", async () => {
    const req = createMockRequest("/dashboard/deals/123/edit", {
      cookies: { "next-auth.session-token": "valid" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
    expect(mocks.generateCsrf).toHaveBeenCalled();
  });
});

describe("middleware - open redirect prevention on /login", () => {
  it("strips external callbackUrl from /login", async () => {
    const req = createMockRequest("/login", {
      searchParams: { callbackUrl: "https://evil.com" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).not.toContain("evil.com");
  });

  it("preserves safe callbackUrl on /login", async () => {
    const req = createMockRequest("/login", {
      searchParams: { callbackUrl: "/dashboard" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("strips javascript: scheme callbackUrl", async () => {
    const req = createMockRequest("/login", {
      searchParams: { callbackUrl: "javascript:alert(1)" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("strips protocol-relative callbackUrl", async () => {
    const req = createMockRequest("/login", {
      searchParams: { callbackUrl: "//evil.com" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows /login with empty callbackUrl", async () => {
    const req = createMockRequest("/login", {
      searchParams: { callbackUrl: "" },
    });
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /login without callbackUrl", async () => {
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });
});
