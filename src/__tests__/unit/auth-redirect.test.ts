import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirectToLogin } from "@/lib/auth/redirect";

describe("redirectToLogin", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  it("redirects to /login without callbackUrl", () => {
    redirectToLogin();
    expect(window.location.href).toBe("/login");
  });

  it("redirects to /login with callbackUrl", () => {
    redirectToLogin("/dashboard");
    expect(window.location.href).toBe("/login?callbackUrl=%2Fdashboard");
  });

  it("encodes the callbackUrl properly", () => {
    redirectToLogin("/dashboard/deals/123/edit");
    expect(window.location.href).toBe(
      "/login?callbackUrl=%2Fdashboard%2Fdeals%2F123%2Fedit"
    );
  });

  it("handles callbackUrl with query parameters", () => {
    redirectToLogin("/dashboard/deals?page=2&status=active");
    const expected = "/login?callbackUrl=%2Fdashboard%2Fdeals%3Fpage%3D2%26status%3Dactive";
    expect(window.location.href).toBe(expected);
  });

  it("handles empty string callbackUrl as no callbackUrl", () => {
    redirectToLogin("");
    expect(window.location.href).toBe("/login");
  });

  it("handles root path callbackUrl", () => {
    redirectToLogin("/");
    expect(window.location.href).toBe("/login?callbackUrl=%2F");
  });

  it("handles deeply nested callbackUrl", () => {
    redirectToLogin("/dashboard/settings/billing/history");
    expect(window.location.href).toContain("callbackUrl=");
    expect(window.location.href).toContain("%2Fdashboard%2Fsettings%2Fbilling%2Fhistory");
  });

  it("handles callbackUrl with special characters", () => {
    redirectToLogin("/dashboard/deals?search=hello world");
    expect(window.location.href).toContain("callbackUrl=");
    expect(decodeURIComponent(window.location.href)).toContain("search=hello world");
  });
});

describe("redirectToLogin - open redirect protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  it("rejects external URLs (https://evil.com)", () => {
    redirectToLogin("https://evil.com");
    expect(window.location.href).toBe("/login");
  });

  it("rejects external URLs (http://evil.com)", () => {
    redirectToLogin("http://evil.com");
    expect(window.location.href).toBe("/login");
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    redirectToLogin("//evil.com");
    expect(window.location.href).toBe("/login");
  });

  it("rejects javascript: scheme URLs", () => {
    redirectToLogin("javascript:alert(1)");
    expect(window.location.href).toBe("/login");
  });

  it("rejects data: scheme URLs", () => {
    redirectToLogin("data:text/html,<script>alert(1)</script>");
    expect(window.location.href).toBe("/login");
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
