import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
  hashToken,
  isMutatingMethod,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "@/lib/security/csrf";
import { isSafeRedirectUrl } from "@/lib/auth/redirect";

describe("CSRF security edge cases", () => {
  describe("generateCsrfToken", () => {
    it("returns exactly 64 hex characters", () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens across many calls", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 200; i++) {
        tokens.add(generateCsrfToken());
      }
      expect(tokens.size).toBe(200);
    });

    it("does not produce sequential patterns", () => {
      const t1 = generateCsrfToken();
      const t2 = generateCsrfToken();
      let sameChars = 0;
      for (let i = 0; i < 64; i++) {
        if (t1[i] === t2[i]) sameChars++;
      }
      expect(sameChars).toBeLessThan(50);
    });
  });

  describe("validateCsrfToken - timing-safe comparison", () => {
    it("returns true for identical tokens", () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    it("returns false for undefined cookie", () => {
      expect(validateCsrfToken(undefined, "token")).toBe(false);
    });

    it("returns false for undefined header", () => {
      expect(validateCsrfToken("token", undefined)).toBe(false);
    });

    it("returns false for both undefined", () => {
      expect(validateCsrfToken(undefined, undefined)).toBe(false);
    });

    it("returns false for empty strings", () => {
      expect(validateCsrfToken("", "")).toBe(false);
    });

    it("returns false for tokens differing in first character", () => {
      expect(validateCsrfToken("abcdef", "bbcdef")).toBe(false);
    });

    it("returns false for tokens differing in last character", () => {
      expect(validateCsrfToken("abcdef", "abcdeg")).toBe(false);
    });

    it("returns false when header is prefix of cookie", () => {
      expect(validateCsrfToken("abcdef", "abcde")).toBe(false);
    });

    it("returns false when cookie is prefix of header", () => {
      expect(validateCsrfToken("abcde", "abcdef")).toBe(false);
    });

    it("returns true for tokens with special characters when matching", () => {
      const token = "abc+123/XYZ==!@#";
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    it("returns false for tokens that are almost identical (one bit off)", () => {
      const base = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const modified = base.slice(0, -1) + "b";
      expect(validateCsrfToken(base, modified)).toBe(false);
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
      expect(isMutatingMethod("Post")).toBe(true);
      expect(isMutatingMethod("get")).toBe(false);
    });

    it("returns false for unknown method", () => {
      expect(isMutatingMethod("CUSTOM")).toBe(false);
    });
  });

  describe("hashToken - SHA-256", () => {
    it("produces deterministic hash", async () => {
      const h1 = await hashToken("test");
      const h2 = await hashToken("test");
      expect(h1).toBe(h2);
    });

    it("produces different hashes for different inputs", async () => {
      const h1 = await hashToken("input1");
      const h2 = await hashToken("input2");
      expect(h1).not.toBe(h2);
    });

    it("matches known SHA-256 output for 'hello'", async () => {
      const hash = await hashToken("hello");
      expect(hash).toBe(
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
      );
    });

    it("handles empty string", async () => {
      const hash = await hashToken("");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("handles unicode", async () => {
      const hash = await hashToken("日本語テスト");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("handles very long string", async () => {
      const hash = await hashToken("x".repeat(100000));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("exported constants", () => {
    it("CSRF_COOKIE_NAME is csrfToken", () => {
      expect(CSRF_COOKIE_NAME).toBe("csrfToken");
    });

    it("CSRF_HEADER_NAME is X-CSRF-Token", () => {
      expect(CSRF_HEADER_NAME).toBe("X-CSRF-Token");
    });
  });
});

describe("isSafeRedirectUrl - comprehensive edge cases", () => {
  describe("accepts valid internal paths", () => {
    const validPaths = [
      "/",
      "/dashboard",
      "/dashboard/deals/123/edit",
      "/dashboard/settings/billing/history",
      "/login",
      "/callback",
      "/_next/data/buildid/page.json",
      "/api/auth/callback/google",
      "/a",
      "/_private",
      "/user-profile",
    ];

    for (const path of validPaths) {
      it(`accepts "${path}"`, () => {
        expect(isSafeRedirectUrl(path)).toBe(true);
      });
    }
  });

  describe("rejects external and dangerous URLs", () => {
    const invalidPaths = [
      "https://evil.com",
      "http://evil.com",
      "HTTPS://EVIL.COM",
      "//evil.com",
      "///evil.com",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "ftp://evil.com",
      "mailto:user@evil.com",
      "vbscript:alert(1)",
      "blob:https://evil.com/uuid",
      "",
      "relative-path",
      "./relative",
      "../parent",
    ];

    for (const path of invalidPaths) {
      it(`rejects "${path}"`, () => {
        expect(isSafeRedirectUrl(path)).toBe(false);
      });
    }
  });
});
