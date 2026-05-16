import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieStore = {
  getAll: vi.fn(),
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.stubGlobal("fetch", vi.fn());

import { createServerFetch, ApiError } from "@/lib/auth/server-fetch";

describe("createServerFetch - initialization", () => {
  it("returns get, post, put, delete methods", () => {
    const client = createServerFetch();
    expect(typeof client.get).toBe("function");
    expect(typeof client.post).toBe("function");
    expect(typeof client.put).toBe("function");
    expect(typeof client.delete).toBe("function");
  });

  it("accepts empty options", () => {
    const client = createServerFetch();
    expect(client).toBeDefined();
  });

  it("accepts baseUrl option", () => {
    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    expect(client).toBeDefined();
  });
});

describe("createServerFetch - buildHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("includes Content-Type application/json in GET request", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "ok" }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.get("/api/test");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = fetchCall[1].headers;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("includes cookies from cookie store", async () => {
    mockCookieStore.getAll.mockReturnValue([
      { name: "session", value: "abc123" },
      { name: "csrfToken", value: "csrf-abc" },
    ]);
    mockCookieStore.get.mockReturnValue({ name: "csrfToken", value: "csrf-abc" });

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "ok" }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.get("/api/test");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = fetchCall[1].headers;
    expect(headers.Cookie).toContain("session=abc123");
    expect(headers.Cookie).toContain("csrfToken=csrf-abc");
  });

  it("includes CSRF token header when csrfToken cookie exists", async () => {
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue({ name: "csrfToken", value: "my-csrf-token" });

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "ok" }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.post("/api/test", { name: "test" });

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = fetchCall[1].headers;
    expect(headers["X-CSRF-Token"]).toBe("my-csrf-token");
  });

  it("does not include CSRF header when no csrfToken cookie", async () => {
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "ok" }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.get("/api/test");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = fetchCall[1].headers;
    expect(headers).not.toHaveProperty("X-CSRF-Token");
  });
});

describe("createServerFetch - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("makes GET request to correct URL", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    const result = await client.get("/api/templates");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/templates",
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual({ items: [] });
  });

  it("appends query params to GET URL", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.get("/api/templates", { search: "test", category: "outreach" });

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain("search=test");
    expect(fetchCall[0]).toContain("category=outreach");
  });

  it("makes GET request without params", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.get("/api/templates");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toBe("http://localhost:3000/api/templates");
  });
});

describe("createServerFetch - POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("makes POST request with JSON body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: "1" }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    const result = await client.post("/api/templates", { name: "Test" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/templates",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      })
    );
    expect(result).toEqual({ id: "1" });
  });

  it("makes POST request without body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.post("/api/action");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[1].body).toBeUndefined();
  });
});

describe("createServerFetch - PUT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("makes PUT request with JSON body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: true }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    const result = await client.put("/api/templates/1", { name: "Updated" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/templates/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      })
    );
    expect(result).toEqual({ updated: true });
  });
});

describe("createServerFetch - DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("makes DELETE request", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ deleted: true }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    const result = await client.delete("/api/templates/1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/templates/1",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(result).toEqual({ deleted: true });
  });
});

describe("createServerFetch - error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("throws ApiError on 401 response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({}),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await expect(client.get("/api/protected")).rejects.toThrow("Unauthorized");
    await expect(client.get("/api/protected")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError with error message from response body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: () => Promise.resolve({ error: "Validation failed" }),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await expect(client.post("/api/templates", {})).rejects.toThrow("Validation failed");
  });

  it("throws ApiError with statusText when no error in body", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("not json")),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await expect(client.get("/api/broken")).rejects.toThrow("Internal Server Error");
  });

  it("throws ApiError with body property", async () => {
    const errorBody = { error: "Not found", details: { id: "missing" } };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve(errorBody),
    });

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    try {
      await client.get("/api/missing");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as InstanceType<typeof ApiError>).status).toBe(404);
      expect((err as InstanceType<typeof ApiError>).body).toEqual(errorBody);
    }
  });

  it("handles network errors", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new TypeError("Failed to fetch")
    );

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await expect(client.get("/api/test")).rejects.toThrow("Failed to fetch");
  });
});
