import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
  getCsrfCookie,
  setCsrfCookie,
} from "@/lib/security/csrf";
import { NextResponse } from "next/server";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("generateCsrfToken", () => {
  it("returns a string", () => {
    const token = generateCsrfToken();
    expect(typeof token).toBe("string");
  });

  it("returns a non-empty string", () => {
    const token = generateCsrfToken();
    expect(token.length).toBeGreaterThan(0);
  });

  it("generates unique tokens", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    expect(token1).not.toBe(token2);
  });
});

describe("getCsrfCookie", () => {
  it("returns cookie value when present", () => {
    const req = {
      cookies: {
        get: (name: string) =>
          name === "csrfToken" ? { value: "my-token" } : undefined,
      },
    } as any;
    expect(getCsrfCookie(req)).toBe("my-token");
  });

  it("returns undefined when cookie is not present", () => {
    const req = {
      cookies: {
        get: () => undefined,
      },
    } as any;
    expect(getCsrfCookie(req)).toBeUndefined();
  });
});

describe("setCsrfCookie", () => {
  it("sets the csrfToken cookie on the response", () => {
    const response = NextResponse.next();
    const result = setCsrfCookie(response, "test-token");
    const setCookie = result.headers.get("set-cookie");
    expect(setCookie).toContain("csrfToken=test-token");
  });

  it("returns the same response object", () => {
    const response = NextResponse.next();
    const result = setCsrfCookie(response, "test-token");
    expect(result).toBe(response);
  });
});

describe("validateCsrfToken", () => {
  it("returns true when cookie and header match", () => {
    const req = {
      cookies: {
        get: (name: string) =>
          name === "csrfToken" ? { value: "matching-token" } : undefined,
      },
      headers: new Headers({ "X-CSRF-Token": "matching-token" }),
    } as any;
    expect(validateCsrfToken(req)).toBe(true);
  });

  it("returns false when cookie and header do not match", () => {
    const req = {
      cookies: {
        get: (name: string) =>
          name === "csrfToken" ? { value: "cookie-token" } : undefined,
      },
      headers: new Headers({ "X-CSRF-Token": "header-token" }),
    } as any;
    expect(validateCsrfToken(req)).toBe(false);
  });

  it("returns false when cookie is missing", () => {
    const req = {
      cookies: {
        get: () => undefined,
      },
      headers: new Headers({ "X-CSRF-Token": "some-token" }),
    } as any;
    expect(validateCsrfToken(req)).toBe(false);
  });

  it("returns false when header is missing", () => {
    const req = {
      cookies: {
        get: (name: string) =>
          name === "csrfToken" ? { value: "some-token" } : undefined,
      },
      headers: new Headers(),
    } as any;
    expect(validateCsrfToken(req)).toBe(false);
  });

  it("returns false when both cookie and header are missing", () => {
    const req = {
      cookies: {
        get: () => undefined,
      },
      headers: new Headers(),
    } as any;
    expect(validateCsrfToken(req)).toBe(false);
  });
});
