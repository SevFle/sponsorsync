import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, ApiError } from "@/lib/api-client";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("sends credentials: include by default", async () => {
    const mockJson = vi.fn().mockResolvedValue({ data: "test" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: mockJson,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetch("/api/test");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ credentials: "include" })
    );
    expect(result).toEqual({ data: "test" });
  });

  it("sends Content-Type application/json by default", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/json" })
    );
  });

  it("sends X-CSRF-Token header when csrfToken cookie is present", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrfToken=abc123",
    });

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({ "X-CSRF-Token": "abc123" })
    );
  });

  it("omits X-CSRF-Token when no csrfToken cookie", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("appends params as query string", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/items", { params: { page: "2", limit: "10" } });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items?page=2&limit=10",
      expect.anything()
    );
  });

  it("throws ApiError on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: vi.fn().mockResolvedValue({ error: "Not found" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(apiFetch("/api/missing")).rejects.toThrow(ApiError);
    await expect(apiFetch("/api/missing")).rejects.toThrow("Not found");
  });

  it("throws ApiError with status code", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/fail");
    } catch (e) {
      expect((e as ApiError).status).toBe(500);
    }
  });

  it("allows custom headers to override defaults", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test", {
      headers: { "Content-Type": "text/plain", "X-Custom": "yes" },
    });
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "text/plain",
        "X-Custom": "yes",
      })
    );
  });
});

describe("ApiError", () => {
  it("has correct name and properties", () => {
    const err = new ApiError(422, "Validation failed");
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(422);
    expect(err.message).toBe("Validation failed");
  });
});
