import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("redirectToLogin", () => {
  const originalWindow = global.window;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetModules();
    delete (window as any).location;
    (window as any).location = { href: "" };
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    global.window = originalWindow;
  });

  it("redirects to /login when no callbackUrl provided", async () => {
    const { redirectToLogin } = await import("@/lib/auth/redirect");
    redirectToLogin();
    expect(window.location.href).toBe("/login");
  });

  it("redirects to /login with callbackUrl query param", async () => {
    const { redirectToLogin } = await import("@/lib/auth/redirect");
    redirectToLogin("/dashboard/deals");
    expect(window.location.href).toBe("/login?callbackUrl=%2Fdashboard%2Fdeals");
  });

  it("encodes special characters in callbackUrl", async () => {
    const { redirectToLogin } = await import("@/lib/auth/redirect");
    redirectToLogin("/dashboard/deals/123/edit?tab=overview");
    expect(window.location.href).toBe(
      "/login?callbackUrl=%2Fdashboard%2Fdeals%2F123%2Fedit%3Ftab%3Doverview"
    );
  });

  it("redirects to /login with root path callbackUrl", async () => {
    const { redirectToLogin } = await import("@/lib/auth/redirect");
    redirectToLogin("/");
    expect(window.location.href).toBe("/login?callbackUrl=%2F");
  });

  it("does not throw when callbackUrl is undefined", async () => {
    const { redirectToLogin } = await import("@/lib/auth/redirect");
    expect(() => redirectToLogin(undefined)).not.toThrow();
    expect(window.location.href).toBe("/login");
  });

  it("handles callbackUrl with hash fragment", async () => {
    const { redirectToLogin } = await import("@/lib/auth/redirect");
    redirectToLogin("/dashboard#section");
    expect(window.location.href).toBe("/login?callbackUrl=%2Fdashboard%23section");
  });
});
