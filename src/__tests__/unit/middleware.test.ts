import { describe, it, expect } from "vitest";
import { middleware } from "@/middleware";
import { NextResponse } from "next/server";

function createMockRequest(pathname: string) {
  return {
    nextUrl: { pathname },
  } as any;
}

describe("middleware", () => {
  it("allows requests to /api/webhooks paths", () => {
    const req = createMockRequest("/api/webhooks/stripe");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/health", () => {
    const req = createMockRequest("/api/health");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to arbitrary paths", () => {
    const req = createMockRequest("/dashboard/deals");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /api/deals", () => {
    const req = createMockRequest("/api/deals");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to /login", () => {
    const req = createMockRequest("/login");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows requests to root path", () => {
    const req = createMockRequest("/");
    const response = middleware(req);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it("allows webhook sub-paths", () => {
    const paths = ["/api/webhooks/inngest", "/api/webhooks/stripe", "/api/webhooks/custom"];
    for (const path of paths) {
      const req = createMockRequest(path);
      const response = middleware(req);
      expect(response).toBeInstanceOf(NextResponse);
    }
  });
});
