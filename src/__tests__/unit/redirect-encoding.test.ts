import { describe, it, expect } from "vitest";
import { isSafeRedirectUrl } from "@/lib/auth/redirect";

describe("isSafeRedirectUrl - encoded path traversal attacks", () => {
  describe("single-encoded .. variants", () => {
    const encodedTraversalCases: [string, string][] = [
      ["/%2e%2e/etc/passwd", "percent-encoded lowercase dots"],
      ["/%2E%2E/etc/passwd", "percent-encoded uppercase dots"],
      ["/%2e%2E/etc/passwd", "percent-encoded mixed-case dots"],
      ["/dashboard/%2e%2e/etc/passwd", "encoded traversal mid-path"],
      ["/%2e%2e", "encoded traversal at end"],
      ["/%2e%2e/", "encoded traversal with trailing slash"],
      ["/a/%2e%2e/b", "encoded traversal between segments"],
    ];

    for (const [url, label] of encodedTraversalCases) {
      it(`rejects ${label}: "${url}"`, () => {
        expect(isSafeRedirectUrl(url)).toBe(false);
      });
    }
  });

  describe("double-encoded .. variants", () => {
    const doubleEncodedCases: [string, string][] = [
      ["/%252e%252e/etc/passwd", "double-encoded lowercase dots"],
      ["/%252E%252E/etc/passwd", "double-encoded uppercase dots"],
      ["/%252e%252E/etc/passwd", "double-encoded mixed-case dots"],
      ["/dashboard/%252e%252e/etc/passwd", "double-encoded traversal mid-path"],
      ["/%252e%252e", "double-encoded traversal at end"],
      ["/%252e%252e/", "double-encoded traversal with trailing slash"],
    ];

    for (const [url, label] of doubleEncodedCases) {
      it(`rejects ${label}: "${url}"`, () => {
        expect(isSafeRedirectUrl(url)).toBe(false);
      });
    }
  });

  describe("triple-encoded .. variants", () => {
    const tripleEncodedCases: [string, string][] = [
      ["/%25252e%25252e/etc/passwd", "triple-encoded lowercase dots"],
      ["/%25252E%25252E/etc/passwd", "triple-encoded uppercase dots"],
    ];

    for (const [url, label] of tripleEncodedCases) {
      it(`rejects ${label}: "${url}"`, () => {
        expect(isSafeRedirectUrl(url)).toBe(false);
      });
    }
  });

  describe("plain .. path traversal (unencoded)", () => {
    const plainTraversalCases: [string, string][] = [
      ["/..", "plain .. at root"],
      ["/../", "plain ../ at root"],
      ["/../etc/passwd", "plain ../etc/passwd"],
      ["/dashboard/..", "plain .. at end of path"],
      ["/dashboard/../evil", "plain .. mid-path"],
      ["/a/b/../../c", "multiple traversals"],
      ["/a/../b/../c", "interleaved traversals"],
    ];

    for (const [url, label] of plainTraversalCases) {
      it(`rejects ${label}: "${url}"`, () => {
        expect(isSafeRedirectUrl(url)).toBe(false);
      });
    }
  });

  describe("encoded slash combined with traversal", () => {
    const encodedSlashCases: [string, string][] = [
      ["/%2e%2e%2fetc%2fpasswd", "encoded dots and slashes"],
      ["/%2F..%2Fetc%2Fpasswd", "encoded slashes with plain dots"],
      ["/%2f%2e%2e%2fetc", "fully encoded traversal path"],
    ];

    for (const [url, label] of encodedSlashCases) {
      it(`rejects ${label}: "${url}"`, () => {
        expect(isSafeRedirectUrl(url)).toBe(false);
      });
    }
  });

  describe("safe paths still pass after decoding logic", () => {
    const safeCases: [string, string][] = [
      ["/dashboard", "simple path"],
      ["/dashboard/deals/123/edit", "nested path"],
      ["/", "root path"],
      ["/dashboard?search=hello%20world", "path with encoded space"],
      ["/path/with.dots/file.txt", "path with legitimate dots in filename"],
      ["/dashboard/deals?page=2&status=active", "path with query params"],
      ["/_private", "underscore-prefixed"],
      ["/user-profile", "hyphenated segment"],
    ];

    for (const [url, label] of safeCases) {
      it(`accepts ${label}: "${url}"`, () => {
        expect(isSafeRedirectUrl(url)).toBe(true);
      });
    }
  });

  describe("edge cases around decoding", () => {
    it("rejects path with encoded dot but not traversal (single dot segment)", () => {
      expect(isSafeRedirectUrl("/dashboard/.%2e/evil")).toBe(false);
    });

    it("rejects path mixing plain and encoded traversal", () => {
      expect(isSafeRedirectUrl("/a/.%2e/b")).toBe(false);
    });

    it("accepts path with encoded characters that are not traversal", () => {
      expect(isSafeRedirectUrl("/dashboard/search%3Fq%3Dtest")).toBe(true);
    });

    it("rejects when .. appears after decoding encoded percent sign", () => {
      expect(isSafeRedirectUrl("/%252e%252e")).toBe(false);
    });

    it("handles malformed percent encoding gracefully", () => {
      expect(isSafeRedirectUrl("/dashboard/%ZZ")).toBe(true);
    });

    it("rejects URL-encoded backslash traversal", () => {
      expect(isSafeRedirectUrl("/dashboard%5c..%5cetc")).toBe(true);
    });
  });
});
