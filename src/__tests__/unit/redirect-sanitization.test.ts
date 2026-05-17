import { describe, it, expect } from "vitest";
import { isSafeRedirectUrl } from "@/lib/auth/redirect";

const SAFE_PATH_RE = /^\/[a-zA-Z0-9_][a-zA-Z0-9\-._~\/?=%&+ :@]*$|^\/$/;

describe("isSafeRedirectUrl - positive assertions of safe values", () => {
  describe("safe values must match the path-only pattern", () => {
    const safeValues: [string, string][] = [
      ["/", "root path"],
      ["/dashboard", "simple dashboard path"],
      ["/dashboard/deals", "nested path"],
      ["/dashboard/deals/123/edit", "deeply nested with ID"],
      ["/dashboard/settings/billing/history", "deep path"],
      ["/dashboard/deals?page=2&status=active", "path with query params"],
      ["/dashboard/deals?search=hello%20world", "path with encoded space"],
      ["/dashboard/deals?search=hello+world", "path with plus encoding"],
      ["/a", "single-char segment"],
      ["/_private", "underscore-prefixed segment"],
      ["/user-profile", "hyphenated segment"],
      ["/path/with%20space", "percent-encoded space"],
      ["/path/with=values", "equals sign"],
      ["/path/with&amp", "ampersand"],
      ["/path/with:colon", "colon"],
      ["/path/with@sign", "at sign"],
      ["/path/with.dots", "dots"],
      ["/path/with~tilde", "tilde"],
      ["/path/with_underscore", "underscore"],
    ];

    for (const [value, label] of safeValues) {
      it(`accepts ${label}: "${value}"`, () => {
        expect(isSafeRedirectUrl(value)).toBe(true);
        expect(value).toMatch(SAFE_PATH_RE);
      });
    }
  });

  describe("unsafe values must NOT match the path-only pattern", () => {
    const unsafeValues: [string, string][] = [
      ["https://evil.com", "https external URL"],
      ["http://evil.com", "http external URL"],
      ["HTTPS://EVIL.COM", "uppercase external URL"],
      ["//evil.com", "protocol-relative URL"],
      ["///evil.com", "triple-slash URL"],
      ["javascript:alert(1)", "javascript scheme"],
      ["data:text/html,<script>alert(1)</script>", "data scheme"],
      ["ftp://evil.com", "ftp scheme"],
      ["mailto:user@evil.com", "mailto scheme"],
      ["vbscript:alert(1)", "vbscript scheme"],
      ["https://evil.com/dashboard", "external with safe-looking path"],
      ["https://evil.com/", "external with trailing slash"],
      ["https://evil.com?redirect=/safe", "external with query"],
      ["https://evil.com#section", "external with fragment"],
      ["  https://evil.com  ", "whitespace-padded external"],
      ["https://evil.com%2Fdashboard", "external with encoded path"],
      ["", "empty string"],
    ];

    for (const [value, label] of unsafeValues) {
      it(`rejects ${label}: "${value}"`, () => {
        expect(isSafeRedirectUrl(value)).toBe(false);
        expect(value).not.toMatch(SAFE_PATH_RE);
      });
    }
  });

  describe("boundary: safe value is always a relative root-starting path", () => {
    it("every accepted value starts with exactly one /", () => {
      const safePaths = [
        "/",
        "/dashboard",
        "/dashboard/deals",
        "/dashboard/deals/123",
        "/a",
        "/_test",
        "/path-name",
      ];
      for (const p of safePaths) {
        expect(isSafeRedirectUrl(p)).toBe(true);
        expect(p).toMatch(/^\/[^/]|^\/$/);
      }
    });

    it("no rejected value is a safe relative path", () => {
      const unsafePaths = [
        "https://evil.com",
        "http://evil.com",
        "//evil.com",
        "javascript:alert(1)",
        "data:text/html,<h1>hi</h1>",
      ];
      for (const p of unsafePaths) {
        expect(isSafeRedirectUrl(p)).toBe(false);
        expect(p).not.toMatch(/^\/[^/]|^\/$/);
      }
    });
  });
});
