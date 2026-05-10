import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, ApiError } from "@/lib/api-client";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch - credentials: include", () => {
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

  it("always sends credentials: include even with custom options", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test", { method: "POST", body: "{}" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        body: "{}",
      })
    );
  });

  it("sends credentials: include for PUT requests", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test", { method: "PUT", body: "{}" });
    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.credentials).toBe("include");
    expect(callOpts.method).toBe("PUT");
  });

  it("sends credentials: include for DELETE requests", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test", { method: "DELETE" });
    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.credentials).toBe("include");
    expect(callOpts.method).toBe("DELETE");
  });
});

describe("apiFetch - headers", () => {
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

  it("decodes URL-encoded CSRF token from cookie", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrfToken=token%20with%20spaces",
    });

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({ "X-CSRF-Token": "token with spaces" })
    );
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

  it("preserves custom headers alongside CSRF token", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrfToken=mytoken",
    });

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test", {
      headers: { "X-Custom": "custom-value" },
    });
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "X-CSRF-Token": "mytoken",
        "X-Custom": "custom-value",
      })
    );
  });
});

describe("apiFetch - query params", () => {
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

  it("does not append query string when no params", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/items");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items",
      expect.anything()
    );
  });

  it("handles empty params object", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/items", { params: {} });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items?",
      expect.anything()
    );
  });
});

describe("apiFetch - error handling", () => {
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

  it("throws ApiError with status code 422", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: vi.fn().mockResolvedValue({ error: "Validation failed" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/validate");
    } catch (e) {
      expect((e as ApiError).status).toBe(422);
      expect((e as ApiError).message).toBe("Validation failed");
    }
  });

  it("falls back to statusText when error body has no error field", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/fail");
    } catch (e) {
      expect((e as ApiError).message).toBe("Internal Server Error");
    }
  });

  it("falls back to statusText when json parse fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/fail");
    } catch (e) {
      expect((e as ApiError).status).toBe(502);
      expect((e as ApiError).message).toBe("Bad Gateway");
    }
  });

  it("throws ApiError on 401 unauthorized", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/protected");
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
      expect((e as ApiError).message).toBe("Unauthorized");
    }
  });

  it("throws ApiError on 403 forbidden", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: vi.fn().mockResolvedValue({ error: "Access denied" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await apiFetch("/api/forbidden");
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }
  });
});

describe("apiFetch - signal/abort support", () => {
  it("passes abort signal to fetch", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const controller = new AbortController();
    await apiFetch("/api/test", { signal: controller.signal });

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.signal).toBe(controller.signal);
  });
});

describe("apiFetch - return types", () => {
  it("returns typed response with generic type parameter", async () => {
    interface TestItem {
      id: string;
      name: string;
    }

    const mockData: TestItem = { id: "1", name: "Test" };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetch<TestItem>("/api/test");
    expect(result).toEqual({ id: "1", name: "Test" });
  });

  it("returns array response", async () => {
    const mockData = [{ id: "1" }, { id: "2" }];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetch("/api/test");
    expect(result).toEqual(mockData);
  });

  it("returns null response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(null),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await apiFetch("/api/test");
    expect(result).toBeNull();
  });
});

describe("ApiError", () => {
  it("has correct name and properties", () => {
    const err = new ApiError(422, "Validation failed");
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(422);
    expect(err.message).toBe("Validation failed");
  });

  it("is an instance of Error", () => {
    const err = new ApiError(500, "Server error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("can be caught with instanceof check", () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const checkError = async () => {
      try {
        await apiFetch("/api/fail");
      } catch (e) {
        if (e instanceof ApiError) {
          return e.status;
        }
        return null;
      }
      return null;
    };

    return expect(checkError()).resolves.toBe(500);
  });
});
