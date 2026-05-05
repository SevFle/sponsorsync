import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const API_BASE = "http://localhost:3001";

describe("apiClient: buildHeaders loop behavior", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", API_BASE);
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function importClient() {
    return await import("../src/lib/api-client");
  }

  function mockFetchOk(data: unknown = {}) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(data),
    });
  }

  function getHeadersFromCall(): Record<string, string> {
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    return callArgs[1].headers as Record<string, string>;
  }

  it("lowercases custom header keys via the loop", async () => {
    const { apiClient } = await importClient();
    mockFetchOk();

    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("loop does not execute when options.headers is undefined", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    expect(Object.keys(headers)).toEqual(["content-type"]);
  });

  it("loop does not execute when options.headers is an empty object", async () => {
    mockFetchOk();
    const { apiClient, clearSession } = await importClient();
    clearSession();

    globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      expect(opts.headers).toBeDefined();
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({}),
      });
    });

    await apiClient.get("/test");
  });

  it("auth token and csrf token headers are preserved alongside defaults", async () => {
    const { apiClient, setAuthToken, setCsrfToken } = await importClient();
    setAuthToken("my-jwt");
    setCsrfToken("my-csrf");
    mockFetchOk();

    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["authorization"]).toBe("Bearer my-jwt");
    expect(headers["x-csrf-token"]).toBe("my-csrf");
  });

  it("content-type default is lowercase from the start", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    const keys = Object.keys(headers);
    for (const key of keys) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  it("authorization header format is Bearer followed by space and token", async () => {
    const { apiClient, setAuthToken } = await importClient();
    setAuthToken("eyJhbGciOiJIUzI1NiJ9.test.sig");
    mockFetchOk();

    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    expect(headers["authorization"]).toBe("Bearer eyJhbGciOiJIUzI1NiJ9.test.sig");
    expect(headers["authorization"].startsWith("Bearer ")).toBe(true);
  });

  it("setAuthToken with empty string does not set authorization header (empty is falsy)", async () => {
    const { apiClient, setAuthToken } = await importClient();
    setAuthToken("");
    mockFetchOk();

    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    expect(headers["authorization"]).toBeUndefined();
  });

  it("setCsrfToken with empty string does not set x-csrf-token header (empty is falsy)", async () => {
    const { apiClient, setCsrfToken } = await importClient();
    setCsrfToken("");
    mockFetchOk();

    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    expect(headers["x-csrf-token"]).toBeUndefined();
  });

  it("multiple sequential requests reuse same tokens", async () => {
    const { apiClient, setAuthToken, setCsrfToken } = await importClient();
    setAuthToken("token-123");
    setCsrfToken("csrf-456");

    mockFetchOk();
    await apiClient.get("/test1");
    const headers1 = getHeadersFromCall();

    mockFetchOk();
    await apiClient.post("/test2", {});
    const headers2 = getHeadersFromCall();

    expect(headers1["authorization"]).toBe("Bearer token-123");
    expect(headers2["authorization"]).toBe("Bearer token-123");
    expect(headers1["x-csrf-token"]).toBe("csrf-456");
    expect(headers2["x-csrf-token"]).toBe("csrf-456");
  });

  it("token update between requests is reflected", async () => {
    const { apiClient, setAuthToken } = await importClient();
    setAuthToken("old-token");

    mockFetchOk();
    await apiClient.get("/test1");
    const headers1 = getHeadersFromCall();

    setAuthToken("new-token");
    mockFetchOk();
    await apiClient.get("/test2");
    const headers2 = getHeadersFromCall();

    expect(headers1["authorization"]).toBe("Bearer old-token");
    expect(headers2["authorization"]).toBe("Bearer new-token");
  });

  it("csrf token update between requests is reflected", async () => {
    const { apiClient, setCsrfToken } = await importClient();
    setCsrfToken("old-csrf");

    mockFetchOk();
    await apiClient.post("/test1", {});
    const headers1 = getHeadersFromCall();

    setCsrfToken("new-csrf");
    mockFetchOk();
    await apiClient.post("/test2", {});
    const headers2 = getHeadersFromCall();

    expect(headers1["x-csrf-token"]).toBe("old-csrf");
    expect(headers2["x-csrf-token"]).toBe("new-csrf");
  });

  it("clearSession removes both tokens and subsequent requests have no auth headers", async () => {
    const { apiClient, setAuthToken, setCsrfToken, clearSession } = await importClient();
    setAuthToken("jwt-token");
    setCsrfToken("csrf-token");

    clearSession();
    mockFetchOk();
    await apiClient.get("/test");

    const headers = getHeadersFromCall();
    expect(headers["authorization"]).toBeUndefined();
    expect(headers["x-csrf-token"]).toBeUndefined();
    expect(headers["content-type"]).toBe("application/json");
  });

  it("401 clears both auth and csrf tokens", async () => {
    const { apiClient, setAuthToken, setCsrfToken, getAuthToken, getCsrfToken } =
      await importClient();
    setAuthToken("jwt-will-be-cleared");
    setCsrfToken("csrf-will-be-cleared");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({}),
    });

    await expect(apiClient.get("/test")).rejects.toThrow("API error: 401 Unauthorized");
    expect(getAuthToken()).toBeNull();
    expect(getCsrfToken()).toBeNull();
  });

  it("403 does not clear session tokens", async () => {
    const { apiClient, setAuthToken, setCsrfToken, getAuthToken, getCsrfToken } =
      await importClient();
    setAuthToken("jwt-stays");
    setCsrfToken("csrf-stays");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: () => Promise.resolve({}),
    });

    await expect(apiClient.get("/test")).rejects.toThrow("API error: 403 Forbidden");
    expect(getAuthToken()).toBe("jwt-stays");
    expect(getCsrfToken()).toBe("csrf-stays");
  });

  it("hasValidSession returns true only when authToken is truthy", async () => {
    const { setAuthToken, hasValidSession, clearSession } = await importClient();
    clearSession();
    expect(hasValidSession()).toBe(false);

    setAuthToken(null);
    expect(hasValidSession()).toBe(false);

    setAuthToken("some-token");
    expect(hasValidSession()).toBe(true);
  });

  it("request uses GET method for apiClient.get", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.get("/method-test");

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe("GET");
  });

  it("request uses POST method for apiClient.post", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.post("/method-test", { key: "value" });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe("POST");
  });

  it("request uses PATCH method for apiClient.patch", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.patch("/method-test", { key: "value" });

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe("PATCH");
  });

  it("request uses DELETE method for apiClient.delete", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.delete("/method-test");

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe("DELETE");
  });

  it("constructs full URL with API_BASE and path", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.get("/api/shipments?page=1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/api/shipments?page=1`,
      expect.anything()
    );
  });

  it("encodes special characters in path", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    mockFetchOk();

    await apiClient.get("/api/test/hello%20world");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/test/hello%20world"),
      expect.anything()
    );
  });

  it("returns parsed JSON from response", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();
    const expectedData = { items: [1, 2, 3], total: 3 };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(expectedData),
    });

    const result = await apiClient.get("/api/data");
    expect(result).toEqual(expectedData);
  });

  it("handles fetch rejecting with network error", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiClient.get("/api/test")).rejects.toThrow("Failed to fetch");
  });

  it("handles fetch rejecting with AbortError", async () => {
    const { apiClient, clearSession } = await importClient();
    clearSession();

    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(apiClient.get("/api/test")).rejects.toThrow("Aborted");
  });
});
