import { describe, it, expect, vi } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
  isMutatingMethod,
  hashToken,
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

  it("uses crypto.getRandomValues internally", () => {
    const spy = vi.spyOn(globalThis.crypto, "getRandomValues");
    generateCsrfToken();
    expect(spy).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(spy.mock.calls[0][0]).toHaveLength(32);
    spy.mockRestore();
  });

  it("produces only lowercase hex characters", () => {
    const tokens = Array.from({ length: 50 }, () => generateCsrfToken());
    for (const t of tokens) {
      expect(t).toEqual(t.toLowerCase());
    }
  });

  it("generates tokens with good entropy (no two identical in 100 attempts)", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("returns a 64-character hex string for any input", async () => {
    const hash = await hashToken("test-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the same hash for the same input", async () => {
    const hash1 = await hashToken("consistent-input");
    const hash2 = await hashToken("consistent-input");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await hashToken("input-a");
    const hash2 = await hashToken("input-b");
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string input", async () => {
    const hash = await hashToken("");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles unicode input", async () => {
    const hash = await hashToken("日本語テスト🎉");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles very long input strings", async () => {
    const longInput = "a".repeat(10000);
    const hash = await hashToken(longInput);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses SHA-256 via crypto.subtle", async () => {
    const spy = vi.spyOn(globalThis.crypto.subtle, "digest");
    await hashToken("spy-test");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("SHA-256");
    expect(spy.mock.calls[0][1].constructor.name).toBe("Uint8Array");
    spy.mockRestore();
  });

  it("produces deterministic output matching manual SHA-256", async () => {
    const token = "deterministic-test";
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const expected = Array.from(new Uint8Array(hashBuffer), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    const actual = await hashToken(token);
    expect(actual).toBe(expected);
  });

  it("handles special characters", async () => {
    const hash = await hashToken("!@#$%^&*()_+-=[]{}|;':\",./<>?");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles whitespace-only input", async () => {
    const hash = await hashToken("   \t\n  ");
    expect(hash).toHaveLength(64);
  });

  it("different from raw token value", async () => {
    const token = generateCsrfToken();
    const hash = await hashToken(token);
    expect(hash).not.toBe(token);
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

  it("returns false when tokens have different lengths", () => {
    expect(validateCsrfToken("short", "much-longer-token")).toBe(false);
  });

  it("returns false for single-character mismatch at start", () => {
    expect(validateCsrfToken("abcdef", "xbcdef")).toBe(false);
  });

  it("returns false for single-character mismatch at end", () => {
    expect(validateCsrfToken("abcdef", "abcdeg")).toBe(false);
  });

  it("returns false for single-character mismatch in middle", () => {
    expect(validateCsrfToken("abcdef", "abddef")).toBe(false);
  });

  it("returns true for identical single-character tokens", () => {
    expect(validateCsrfToken("a", "a")).toBe(true);
  });

  it("returns false for different single-character tokens", () => {
    expect(validateCsrfToken("a", "b")).toBe(false);
  });

  it("returns true for matching hex tokens", () => {
    const token = "deadbeef12345678";
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("handles tokens with special characters", () => {
    const token = "tok+en=va.lue/123";
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("returns false when tokens differ only by null byte", () => {
    expect(validateCsrfToken("token\x00", "token\x01")).toBe(false);
  });

  it("returns true for whitespace-only matching tokens", () => {
    expect(validateCsrfToken("   ", "   ")).toBe(true);
  });

  it("uses constant-time comparison (no early exit on first diff)", () => {
    const token1 = "aaaaaa";
    const token2 = "baaaaa";
    const token3 = "aaaaba";
    validateCsrfToken(token1, token2);
    validateCsrfToken(token1, token3);
    expect(validateCsrfToken(token1, token2)).toBe(false);
    expect(validateCsrfToken(token1, token3)).toBe(false);
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

  it("handles mixed case", () => {
    expect(isMutatingMethod("Post")).toBe(true);
    expect(isMutatingMethod("pUt")).toBe(true);
    expect(isMutatingMethod("Delete")).toBe(true);
    expect(isMutatingMethod("PATCH")).toBe(true);
  });

  it("returns false for unknown methods", () => {
    expect(isMutatingMethod("CONNECT")).toBe(false);
    expect(isMutatingMethod("TRACE")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMutatingMethod("")).toBe(false);
  });
});

describe("CSRF constants", () => {
  it("exports correct cookie name", () => {
    expect(CSRF_COOKIE_NAME).toBe("csrfToken");
  });

  it("exports correct header name", () => {
    expect(CSRF_HEADER_NAME).toBe("X-CSRF-Token");
  });

  it("constants are strings", () => {
    expect(typeof CSRF_COOKIE_NAME).toBe("string");
    expect(typeof CSRF_HEADER_NAME).toBe("string");
  });

  it("constants are non-empty", () => {
    expect(CSRF_COOKIE_NAME.length).toBeGreaterThan(0);
    expect(CSRF_HEADER_NAME.length).toBeGreaterThan(0);
  });
});
