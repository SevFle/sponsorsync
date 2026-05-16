import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, ApiError } from "@/lib/api-client";

vi.mock("@/lib/auth/redirect", () => ({
  redirectToLogin: vi.fn(),
}));

import { redirectToLogin } from "@/lib/auth/redirect";

describe("apiFetch - 401 redirect with callbackUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("passes current pathname as callbackUrl on 401", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/dashboard/deals", href: "" },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/deals");
    } catch {}

    expect(redirectToLogin).toHaveBeenCalledWith("/dashboard/deals");

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("throws when window.location is unavailable (TypeError on pathname access)", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: undefined,
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(apiFetch("/api/deals")).rejects.toThrow();

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });
});

describe("apiFetch - 401 does not redirect for non-401 errors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not redirect on 403", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: vi.fn().mockResolvedValue({ error: "CSRF token validation failed" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/deals");
    } catch {}

    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("does not redirect on 500", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/deals");
    } catch {}

    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("does not redirect on 422", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: vi.fn().mockResolvedValue({ error: "Validation" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/deals");
    } catch {}

    expect(redirectToLogin).not.toHaveBeenCalled();
  });
});

describe("apiFetch - CSRF token header behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends X-CSRF-Token when csrfToken cookie exists", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrfToken=abc123def456",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.headers).toHaveProperty("X-CSRF-Token", "abc123def456");
  });

  it("does not send X-CSRF-Token when csrfToken cookie is absent", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "otherCookie=value",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("correctly reads CSRF token when other cookies are present", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "theme=dark; csrfToken=my-token-here; lang=en",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.headers).toHaveProperty("X-CSRF-Token", "my-token-here");
  });
});

describe("ApiError - extended properties", () => {
  it("preserves body in thrown error from actual API response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: vi.fn().mockResolvedValue({
        error: "CSRF token validation failed",
        code: "CSRF_INVALID",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/deals");
      expect.fail("Should have thrown");
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(403);
      expect(err.message).toBe("CSRF token validation failed");
      expect(err.body).toEqual({
        error: "CSRF token validation failed",
        code: "CSRF_INVALID",
      });
    }
  });
});
