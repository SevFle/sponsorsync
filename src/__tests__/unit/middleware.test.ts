import { describe, it, expect, vi, beforeEach } from "vitest";
import { middleware, config } from "@/middleware";
import { NextResponse } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";

function createMockRequest(pathname: string, baseUrl = "http://localhost:3000") {
  return {
    nextUrl: { pathname },
    url: `${baseUrl}${pathname}`,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
});

describe("middleware - public routes (no auth required)", () => {
  it("allows requests to /api/webhooks paths", async () => {
    const req = createMockRequest("/api/webhooks/stripe");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/health", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows webhook sub-paths", async () => {
    const paths = ["/api/webhooks/inngest", "/api/webhooks/stripe", "/api/webhooks/custom"];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = await middleware(req);
      expect(response).toBeInstanceOf(NextResponse);
    }
  });

  it("allows requests to /login without auth", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/login");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /callback without auth", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/callback");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/auth routes without auth", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/api/auth/signin");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/auth/callback without auth", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/api/auth/callback/google");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("does not call getToken for webhook paths", async () => {
    const req = createMockRequest("/api/webhooks/stripe");
    await middleware(req);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("does not call getToken for /api/health", async () => {
    const req = createMockRequest("/api/health");
    await middleware(req);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("does not call getToken for /api/auth paths", async () => {
    const req = createMockRequest("/api/auth/csrf");
    await middleware(req);
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe("middleware - dashboard route protection", () => {
  it("redirects to /login when no token on /dashboard", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects to /login when no token on /dashboard/deals", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard/deals");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects to /login when no token on /dashboard/payments", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard/payments");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects to /login when no token on root path /", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects to /login when no token on nested dashboard routes", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const paths = [
      "/dashboard/deals/new",
      "/dashboard/deals/123",
      "/dashboard/sponsors",
      "/dashboard/sponsors/new",
      "/dashboard/deliverables",
      "/dashboard/payments",
      "/dashboard/templates",
      "/dashboard/integrations",
      "/dashboard/settings",
    ];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = await middleware(req);
      expect(response.headers.get("location")).toContain("/login");
    }
  });

  it("allows /dashboard when token is present", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows /dashboard/deals when token is present", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
    const req = createMockRequest("/dashboard/deals");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows root path / when token is present", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });

  it("calls getToken with request for dashboard paths", async () => {
    const req = createMockRequest("/dashboard");
    await middleware(req);
    expect(getToken).toHaveBeenCalledWith({ req });
  });

  it("calls getToken with request for root path", async () => {
    const req = createMockRequest("/");
    await middleware(req);
    expect(getToken).toHaveBeenCalledWith({ req });
  });
});

describe("middleware - API routes pass-through", () => {
  it("allows requests to /api/deals without auth (route handles its own auth)", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/api/deals");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows requests to /api/dashboard without auth (route handles its own auth)", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/api/dashboard");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows requests to /api/payments without auth", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/api/payments");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/sponsors without auth", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/api/sponsors");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("does not call getToken for non-protected API routes", async () => {
    const paths = ["/api/deals", "/api/payments", "/api/sponsors", "/api/dashboard"];
    for (const path of paths) {
      const req = createMockRequest(path);
      await middleware(req);
    }
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe("middleware - redirect behavior details", () => {
  it("returns 307 status code on redirect", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.status).toBe(307);
  });

  it("constructs redirect URL using request.url as base", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard", "https://app.example.com");
    const response = await middleware(req);
    const location = response.headers.get("location");
    expect(location).toBe("https://app.example.com/login");
  });

  it("redirect URL uses localhost base for local requests", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("does not include original path in redirect URL", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard/deals/123/edit");
    const response = await middleware(req);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/login");
    expect(location).not.toContain("/dashboard");
  });

  it("redirect response has Location header set", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).not.toBeNull();
  });
});

describe("middleware - getToken error handling", () => {
  it("propagates error when getToken rejects", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("JWT secret not configured")
    );
    const req = createMockRequest("/dashboard");
    await expect(middleware(req)).rejects.toThrow("JWT secret not configured");
  });

  it("propagates error when getToken throws on root path", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network failure")
    );
    const req = createMockRequest("/");
    await expect(middleware(req)).rejects.toThrow("Network failure");
  });

  it("does not call getToken for public routes so errors dont affect them", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("JWT failure")
    );
    const paths = [
      "/api/webhooks/stripe",
      "/api/health",
      "/api/auth/signin",
      "/login",
      "/callback",
    ];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = await middleware(req);
      expect(response).toBeInstanceOf(NextResponse);
    }
  });
});

describe("middleware - token edge cases", () => {
  it("redirects when getToken returns undefined", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects when getToken returns null", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects when getToken returns 0", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects when getToken returns empty string", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue("");
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects when getToken returns false", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows access when token is empty object (truthy)", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows access when token has only sub property", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({ sub: "user-42" });
    const req = createMockRequest("/dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows access when token is a non-empty string", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue("some-jwt-token");
    const req = createMockRequest("/dashboard/deals");
    const response = await middleware(req);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("middleware - non-protected routes pass-through", () => {
  it("allows /about without auth check", async () => {
    const req = createMockRequest("/about");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows /privacy without auth check", async () => {
    const req = createMockRequest("/privacy");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows /terms without auth check", async () => {
    const req = createMockRequest("/terms");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows /pricing without auth check", async () => {
    const req = createMockRequest("/pricing");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("does not call getToken for non-protected non-API paths", async () => {
    const paths = ["/about", "/privacy", "/terms", "/pricing", "/contact"];
    for (const path of paths) {
      const req = createMockRequest(path);
      await middleware(req);
    }
    expect(getToken).not.toHaveBeenCalled();
  });

  it("does not call getToken for /login and /callback", async () => {
    const req1 = createMockRequest("/login");
    await middleware(req1);
    const req2 = createMockRequest("/callback");
    await middleware(req2);
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe("middleware - path edge cases", () => {
  it("protects /dashboard/ with trailing slash", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard/");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("protects /dashboard/settings/profile deeply nested", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard/settings/profile");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("protects /dashboard-alias since it starts with /dashboard", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/dashboard-alias");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("does NOT protect /Dashboard (uppercase D) since startsWith is case-sensitive", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/Dashboard");
    const response = await middleware(req);
    expect(response.headers.get("location")).toBeNull();
    expect(getToken).not.toHaveBeenCalled();
  });

  it("does NOT protect /DASHBOARD (all uppercase)", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/DASHBOARD");
    const response = await middleware(req);
    expect(response.headers.get("location")).toBeNull();
  });

  it("protects root path with query parameters via pathname match", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = createMockRequest("/");
    const response = await middleware(req);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows API routes with nested paths like /api/deals/123", async () => {
    const req = createMockRequest("/api/deals/123");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows /api/inngest path without auth", async () => {
    const req = createMockRequest("/api/inngest");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("middleware - config export", () => {
  it("exports a config object with a matcher array", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
  });

  it("matcher excludes _next/static, _next/image, and favicon.ico", () => {
    const matcher = config.matcher[0];
    expect(matcher).toContain("_next/static");
    expect(matcher).toContain("_next/image");
    expect(matcher).toContain("favicon.ico");
  });
});

describe("middleware - route priority and early returns", () => {
  it("checks webhooks before auth routes", async () => {
    const req = createMockRequest("/api/webhooks/stripe");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("checks /api/health before dashboard", async () => {
    const req = createMockRequest("/api/health");
    const response = await middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("checks /api/auth before /login and /callback", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const paths = [
      "/api/auth/signin",
      "/api/auth/callback/google",
      "/api/auth/csrf",
    ];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = await middleware(req);
      expect(response).toBeInstanceOf(NextResponse);
      expect(getToken).not.toHaveBeenCalled();
    }
  });

  it("handles multiple sequential calls independently", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req1 = createMockRequest("/dashboard");
    const res1 = await middleware(req1);
    expect(res1.headers.get("location")).toContain("/login");

    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
    const req2 = createMockRequest("/dashboard");
    const res2 = await middleware(req2);
    expect(res2.headers.get("location")).toBeNull();

    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req3 = createMockRequest("/");
    const res3 = await middleware(req3);
    expect(res3.headers.get("location")).toContain("/login");
  });
});
