import { describe, it, expect } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
  isMutatingMethod,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "@/lib/security/csrf";

describe("generateCsrfToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateCsrfToken()));
    expect(tokens.size).toBe(20);
  });

  it("does not return an empty string", () => {
    const token = generateCsrfToken();
    expect(token.length).toBeGreaterThan(0);
  });
});

describe("validateCsrfToken", () => {
  it("returns true when cookie and header tokens match", () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("returns false when cookie and header tokens differ", () => {
    expect(validateCsrfToken("token-a", "token-b")).toBe(false);
  });

  it("returns false when cookie token is undefined", () => {
    expect(validateCsrfToken(undefined, "token")).toBe(false);
  });

  it("returns false when header token is undefined", () => {
    expect(validateCsrfToken("token", undefined)).toBe(false);
  });

  it("returns false when both tokens are undefined", () => {
    expect(validateCsrfToken(undefined, undefined)).toBe(false);
  });

  it("returns false when cookie token is empty string", () => {
    expect(validateCsrfToken("", "token")).toBe(false);
  });

  it("returns false when header token is empty string", () => {
    expect(validateCsrfToken("token", "")).toBe(false);
  });

  it("returns false when both tokens are empty strings", () => {
    expect(validateCsrfToken("", "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(validateCsrfToken("Token", "token")).toBe(false);
  });
});

describe("isMutatingMethod", () => {
  it("returns true for POST", () => {
    expect(isMutatingMethod("POST")).toBe(true);
  });

  it("returns true for PUT", () => {
    expect(isMutatingMethod("PUT")).toBe(true);
  });

  it("returns true for DELETE", () => {
    expect(isMutatingMethod("DELETE")).toBe(true);
  });

  it("returns true for PATCH", () => {
    expect(isMutatingMethod("PATCH")).toBe(true);
  });

  it("returns false for GET", () => {
    expect(isMutatingMethod("GET")).toBe(false);
  });

  it("returns false for HEAD", () => {
    expect(isMutatingMethod("HEAD")).toBe(false);
  });

  it("returns false for OPTIONS", () => {
    expect(isMutatingMethod("OPTIONS")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isMutatingMethod("post")).toBe(true);
    expect(isMutatingMethod("put")).toBe(true);
    expect(isMutatingMethod("delete")).toBe(true);
    expect(isMutatingMethod("patch")).toBe(true);
    expect(isMutatingMethod("get")).toBe(false);
  });
});

describe("CSRF constants", () => {
  it("exports correct cookie name", () => {
    expect(CSRF_COOKIE_NAME).toBe("csrfToken");
  });

  it("exports correct header name", () => {
    expect(CSRF_HEADER_NAME).toBe("X-CSRF-Token");
  });
});
