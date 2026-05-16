import { describe, it, expect, vi } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
  hashToken,
  isMutatingMethod,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "@/lib/security/csrf";

describe("hashToken", () => {
  it("returns a 64-character hex string", async () => {
    const hash = await hashToken("test-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces consistent hashes for the same input", async () => {
    const hash1 = await hashToken("consistent");
    const hash2 = await hashToken("consistent");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await hashToken("input-a");
    const hash2 = await hashToken("input-b");
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string", async () => {
    const hash = await hashToken("");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles unicode characters", async () => {
    const hash = await hashToken("こんにちは世界");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles very long strings", async () => {
    const longStr = "a".repeat(10000);
    const hash = await hashToken(longStr);
    expect(hash).toHaveLength(64);
  });

  it("produces the expected SHA-256 hash for known input", async () => {
    const hash = await hashToken("hello");
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });
});

describe("validateCsrfToken - constant-time comparison", () => {
  it("returns true for identical tokens of same length", () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("returns false for tokens differing by one character", () => {
    const base = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const diff = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab";
    expect(validateCsrfToken(base, diff)).toBe(false);
  });

  it("returns false when one token is a prefix of the other", () => {
    expect(validateCsrfToken("short", "shorter")).toBe(false);
    expect(validateCsrfToken("shorter", "short")).toBe(false);
  });

  it("returns true for empty strings of same length (both empty)", () => {
    expect(validateCsrfToken("", "")).toBe(false);
  });

  it("handles tokens with special characters", () => {
    const token = "abc+123/XYZ==";
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("returns false when cookie is null-like but not undefined", () => {
    expect(validateCsrfToken(null as any, "token")).toBe(false);
  });

  it("returns false when header is null-like but not undefined", () => {
    expect(validateCsrfToken("token", null as any)).toBe(false);
  });
});

describe("generateCsrfToken - cryptographic properties", () => {
  it("generates 100 unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
    expect(tokens.size).toBe(100);
  });

  it("always returns exactly 64 hex characters", () => {
    for (let i = 0; i < 50; i++) {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
