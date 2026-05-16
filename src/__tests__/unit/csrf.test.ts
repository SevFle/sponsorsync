import { describe, it, expect, vi } from "vitest";
import {
  generateCsrfToken,
  hashToken,
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

  it("only contains lowercase hex characters", () => {
    for (let i = 0; i < 10; i++) {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("produces tokens derived from 32 random bytes", () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(64);
  });

  it("uses crypto.getRandomValues", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    generateCsrfToken();
    expect(spy).toHaveBeenCalledWith(expect.any(Uint8Array));
    const calledArg = spy.mock.calls[0][0] as Uint8Array;
    expect(calledArg).toBeInstanceOf(Uint8Array);
    expect(calledArg.length).toBe(32);
    spy.mockRestore();
  });

  it("handles bytes that produce single-digit hex values", () => {
    const original = crypto.getRandomValues;
    const mock = <T extends Uint8Array>(arr: T): T => {
      for (let i = 0; i < arr.length; i++) arr[i] = 0x0f;
      return arr;
    };
    vi.spyOn(crypto, "getRandomValues").mockImplementation(mock as any);
    const token = generateCsrfToken();
    expect(token).toBe("0f".repeat(32));
    vi.restoreAllMocks();
  });

  it("handles bytes at maximum value 0xff", () => {
    const mock = <T extends Uint8Array>(arr: T): T => {
      for (let i = 0; i < arr.length; i++) arr[i] = 0xff;
      return arr;
    };
    vi.spyOn(crypto, "getRandomValues").mockImplementation(mock as any);
    const token = generateCsrfToken();
    expect(token).toBe("ff".repeat(32));
    vi.restoreAllMocks();
  });

  it("handles bytes at value 0x00", () => {
    const mock = <T extends Uint8Array>(arr: T): T => {
      for (let i = 0; i < arr.length; i++) arr[i] = 0x00;
      return arr;
    };
    vi.spyOn(crypto, "getRandomValues").mockImplementation(mock as any);
    const token = generateCsrfToken();
    expect(token).toBe("00".repeat(32));
    vi.restoreAllMocks();
  });
});

describe("hashToken", () => {
  it("returns a 64-character hex string (SHA-256)", async () => {
    const hash = await hashToken("test-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", async () => {
    const hash1 = await hashToken("same-input");
    const hash2 = await hashToken("same-input");
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

  it("matches known SHA-256 for empty string", async () => {
    const hash = await hashToken("");
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("matches known SHA-256 for 'hello'", async () => {
    const hash = await hashToken("hello");
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("handles unicode input", async () => {
    const hash = await hashToken("héllo wörld 🌍");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles very long input", async () => {
    const longInput = "a".repeat(10000);
    const hash = await hashToken(longInput);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles input with null bytes", async () => {
    const hash = await hashToken("test\x00token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles input with special characters", async () => {
    const hash = await hashToken("!@#$%^&*()_+-=[]{}|;':\",./<>?");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles newlines and whitespace", async () => {
    const hash = await hashToken("line1\nline2\ttab\r\nwindows");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for similar inputs", async () => {
    const hash1 = await hashToken("token1");
    const hash2 = await hashToken("token2");
    expect(hash1).not.toBe(hash2);
  });

  it("uses crypto.subtle.digest with SHA-256", async () => {
    const spy = vi.spyOn(crypto.subtle, "digest");
    await hashToken("test");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("SHA-256");
    const data = spy.mock.calls[0][1] as Uint8Array;
    expect(data.length).toBe(4);
    expect(Array.from(data)).toEqual([116, 101, 115, 116]);
    spy.mockRestore();
  });

  it("encodes input as UTF-8", async () => {
    const hash = await hashToken("ü");
    const encoder = new TextEncoder();
    const expectedData = encoder.encode("ü");
    const expectedHash = await crypto.subtle.digest("SHA-256", expectedData);
    const expectedHex = Array.from(new Uint8Array(expectedHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(hash).toBe(expectedHex);
  });

  it("produces only lowercase hex characters", async () => {
    const inputs = ["test1", "test2", "TEST3", "abc", "123"];
    for (const input of inputs) {
      const hash = await hashToken(input);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    }
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

  it("returns false when tokens differ by a single character", () => {
    expect(validateCsrfToken("token-a", "token-b")).toBe(false);
  });

  it("returns true for matching tokens with special characters", () => {
    const token = "abc123!@#$%";
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("returns false for tokens of different lengths", () => {
    expect(validateCsrfToken("short", "longer-token")).toBe(false);
  });

  it("returns true for matching very long tokens", () => {
    const token = "a".repeat(1000);
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("returns false when one token is a prefix of the other", () => {
    expect(validateCsrfToken("token", "token-extra")).toBe(false);
  });

  it("returns true for single-character matching tokens", () => {
    expect(validateCsrfToken("x", "x")).toBe(true);
  });

  it("returns false for single-character differing tokens", () => {
    expect(validateCsrfToken("x", "y")).toBe(false);
  });

  it("uses constant-time comparison (XOR-based)", () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token, token)).toBe(true);
    const tampered = token.slice(0, -1) + (token.slice(-1) === "a" ? "b" : "a");
    expect(validateCsrfToken(token, tampered)).toBe(false);
  });

  it("returns false for whitespace-padded tokens", () => {
    expect(validateCsrfToken("token", "token ")).toBe(false);
    expect(validateCsrfToken(" token", "token")).toBe(false);
  });

  it("returns true for matching tokens with unicode", () => {
    const token = "tokën-ünïcödé";
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("returns false for numeric strings of different values", () => {
    expect(validateCsrfToken("12345", "12346")).toBe(false);
  });

  it("returns true for matching numeric strings", () => {
    expect(validateCsrfToken("12345", "12345")).toBe(true);
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
    expect(isMutatingMethod("PuT")).toBe(true);
    expect(isMutatingMethod("Delete")).toBe(true);
    expect(isMutatingMethod("PaTcH")).toBe(true);
    expect(isMutatingMethod("Get")).toBe(false);
    expect(isMutatingMethod("Head")).toBe(false);
    expect(isMutatingMethod("Options")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMutatingMethod("")).toBe(false);
  });

  it("returns false for unknown methods", () => {
    expect(isMutatingMethod("TRACE")).toBe(false);
    expect(isMutatingMethod("CONNECT")).toBe(false);
    expect(isMutatingMethod("CUSTOM")).toBe(false);
  });

  it("returns false for near-miss strings", () => {
    expect(isMutatingMethod("POST ")).toBe(false);
    expect(isMutatingMethod(" POST")).toBe(false);
    expect(isMutatingMethod("P0ST")).toBe(false);
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

describe("CSRF integration flow", () => {
  it("generate -> hash -> validate round-trip works", async () => {
    const token = generateCsrfToken();
    const hash = await hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(validateCsrfToken(token, token)).toBe(true);
    expect(validateCsrfToken(token, hash)).toBe(false);
  });

  it("two different tokens produce different hashes", async () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    const hash1 = await hashToken(token1);
    const hash2 = await hashToken(token2);
    expect(token1).not.toBe(token2);
    expect(hash1).not.toBe(hash2);
  });

  it("hashed token cannot be used directly for validation", async () => {
    const token = generateCsrfToken();
    const hash = await hashToken(token);
    expect(validateCsrfToken(hash, token)).toBe(false);
  });

  it("isMutatingMethod gates write operations correctly", () => {
    const readMethods = ["GET", "HEAD", "OPTIONS"];
    const writeMethods = ["POST", "PUT", "DELETE", "PATCH"];
    for (const method of readMethods) {
      expect(isMutatingMethod(method)).toBe(false);
    }
    for (const method of writeMethods) {
      expect(isMutatingMethod(method)).toBe(true);
    }
  });

  it("full CSRF validation flow with generated token", () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(validateCsrfToken(token, token)).toBe(true);
    expect(validateCsrfToken(undefined, token)).toBe(false);
    expect(validateCsrfToken(token, undefined)).toBe(false);
    expect(validateCsrfToken(token, "tampered")).toBe(false);
  });
});
