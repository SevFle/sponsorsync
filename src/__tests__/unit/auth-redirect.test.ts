import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirectToLogin } from "@/lib/auth/redirect";

const SAFE_PATH_RE = /^\/[a-zA-Z0-9_][a-zA-Z0-9\-._~\/?=%&+ :@]*$|^\/$/;

function extractCallbackUrl(href: string): string | null {
  const match = href.match(/[?&]callbackUrl=([^&]*)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

describe("redirectToLogin - sanitized redirect target", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  describe("safe callbackUrl values are preserved in the redirect", () => {
    const safeCases: [string, string][] = [
      ["/dashboard", "simple path"],
      ["/dashboard/deals/123/edit", "nested path with ID"],
      ["/dashboard/settings/billing/history", "deeply nested path"],
      ["/dashboard/deals?page=2&status=active", "path with query params"],
      ["/", "root path"],
    ];

    for (const [callbackUrl, label] of safeCases) {
      it(`preserves safe ${label}: "${callbackUrl}"`, () => {
        redirectToLogin(callbackUrl);
        const href = window.location.href;
        expect(href).toMatch(/^\/login\?callbackUrl=/);
        const sanitized = extractCallbackUrl(href);
        expect(sanitized).toMatch(SAFE_PATH_RE);
        expect(sanitized).toBe(callbackUrl);
      });
    }
  });

  describe("unsafe callbackUrl values are stripped — redirect has no callbackUrl", () => {
    const unsafeCases: [string | undefined, string][] = [
      [undefined, "undefined"],
      ["", "empty string"],
      ["https://evil.com", "https external"],
      ["http://evil.com", "http external"],
      ["HTTPS://EVIL.COM", "uppercase external"],
      ["//evil.com", "protocol-relative"],
      ["///evil.com", "triple-slash"],
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
    ];

    for (const [callbackUrl, label] of unsafeCases) {
      it(`strips unsafe ${label}`, () => {
        redirectToLogin(callbackUrl);
        const href = window.location.href;
        expect(href).toBe("/login");
        expect(extractCallbackUrl(href)).toBeNull();
      });
    }
  });

  describe("redirect href always resolves to a safe target", () => {
    it("no-arg call produces exactly /login", () => {
      redirectToLogin();
      expect(window.location.href).toBe("/login");
    });

    it("safe path href starts with /login and contains encoded callback", () => {
      redirectToLogin("/dashboard/deals/123/edit");
      const href = window.location.href;
      expect(href).toMatch(/^\/login\?callbackUrl=/);
      const callback = extractCallbackUrl(href);
      expect(callback).toMatch(/^\/dashboard/);
    });

    it("special characters in safe path are properly encoded", () => {
      redirectToLogin("/dashboard/deals?search=hello world");
      const href = window.location.href;
      const callback = extractCallbackUrl(href);
      expect(callback).toBe("/dashboard/deals?search=hello world");
      expect(callback).toMatch(SAFE_PATH_RE);
    });
  });
});

describe("redirectToLogin - server-side guard", () => {
  it("does not throw when window is undefined", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
    });

    expect(() => redirectToLogin("/dashboard")).not.toThrow();

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
    });
  });
});
