import { describe, it, expect } from "vitest";
import { middleware } from "@/middleware";

function createMockRequest(
  pathname: string,
  cookies?: Record<string, string>
) {
  const cookieMap = new Map<string, { name: string; value: string }>();
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      cookieMap.set(name, { name, value });
    }
  }

  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      get: (name: string) => cookieMap.get(name) ?? undefined,
    },
  } as any;
}

describe("middleware - public routes", () => {
  it("allows requests to /api/webhooks paths", () => {
    const req = createMockRequest("/api/webhooks/stripe");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /api/health", () => {
    const req = createMockRequest("/api/health");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /login", () => {
    const req = createMockRequest("/login");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows requests to /api/auth/signin", () => {
    const req = createMockRequest("/api/auth/signin");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows webhook sub-paths", () => {
    const paths = ["/api/webhooks/inngest", "/api/webhooks/stripe", "/api/webhooks/custom"];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = middleware(req);
      expect(response.status).toBe(200);
    }
  });
});

describe("middleware - API routes pass through", () => {
  it("allows /api/deals (route handles its own auth)", () => {
    const req = createMockRequest("/api/deals");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("allows /api/dashboard", () => {
    const req = createMockRequest("/api/dashboard");
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});

describe("middleware - page route auth checks", () => {
  it("redirects /dashboard to /login without token", () => {
    const req = createMockRequest("/dashboard");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows /dashboard with session token", () => {
    const req = createMockRequest("/dashboard", {
      "next-auth.session-token": "valid",
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });

  it("redirects / (root) to /login without token", () => {
    const req = createMockRequest("/");
    const response = middleware(req);
    expect(response.status).toBe(307);
  });

  it("allows / (root) with session token", () => {
    const req = createMockRequest("/", {
      "next-auth.session-token": "valid",
    });
    const response = middleware(req);
    expect(response.status).toBe(200);
  });
});
