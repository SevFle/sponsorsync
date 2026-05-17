import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieStore = {
  getAll: vi.fn<() => { name: string; value: string }[]>(),
  get: vi.fn<(name: string) => { name: string; value: string } | undefined>(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

import { createServerFetch, ApiError } from "@/lib/auth/server-fetch";

beforeEach(() => {
  vi.clearAllMocks();
  mockCookieStore.getAll.mockReturnValue([]);
  mockCookieStore.get.mockReturnValue(undefined);
});

describe("createServerFetch - cookie forwarding", () => {
  it("forwards all cookies as Cookie header", async () => {
    mockCookieStore.getAll.mockReturnValue([
      { name: "session", value: "abc123" },
      { name: "csrfToken", value: "csrf-val" },
    ]);
    mockCookieStore.get.mockReturnValue({ name: "csrfToken", value: "csrf-val" });

    const mockJson = vi.fn().mockResolvedValue({ ok: true });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers.Cookie).toBe("session=abc123; csrfToken=csrf-val");
  });

  it("sends empty Cookie header when no cookies exist", async () => {
    mockCookieStore.getAll.mockReturnValue([]);

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers.Cookie).toBe("");
  });
});

describe("createServerFetch - CSRF token header", () => {
  it("sends X-CSRF-Token when csrfToken cookie exists", async () => {
    mockCookieStore.getAll.mockReturnValue([{ name: "csrfToken", value: "my-csrf-token" }]);
    mockCookieStore.get.mockReturnValue({ name: "csrfToken", value: "my-csrf-token" });

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers["X-CSRF-Token"]).toBe("my-csrf-token");
  });

  it("omits X-CSRF-Token when csrfToken cookie does not exist", async () => {
    mockCookieStore.getAll.mockReturnValue([]);
    mockCookieStore.get.mockReturnValue(undefined);

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers).not.toHaveProperty("X-CSRF-Token");
  });
});

describe("createServerFetch - default headers", () => {
  it("sends Content-Type application/json by default", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers["Content-Type"]).toBe("application/json");
  });
});

describe("createServerFetch - get", () => {
  it("calls fetch with GET method", async () => {
    const mockJson = vi.fn().mockResolvedValue({ data: "test" });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    const result = await client.get("/api/items");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual({ data: "test" });
  });

  it("appends query params to URL", async () => {
    const mockJson = vi.fn().mockResolvedValue([]);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/items", { page: "1", limit: "10" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items?page=1&limit=10",
      expect.anything()
    );
  });

  it("does not append query string when no params", async () => {
    const mockJson = vi.fn().mockResolvedValue([]);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/items");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items",
      expect.anything()
    );
  });
});

describe("createServerFetch - post", () => {
  it("calls fetch with POST method and JSON body", async () => {
    const mockJson = vi.fn().mockResolvedValue({ id: "1" });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.post("/api/items", { name: "New" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "New" }),
      })
    );
  });

  it("calls fetch with POST and no body when undefined", async () => {
    const mockJson = vi.fn().mockResolvedValue({ ok: true });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.post("/api/action");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/action",
      expect.objectContaining({ method: "POST", body: undefined })
    );
  });
});

describe("createServerFetch - put", () => {
  it("calls fetch with PUT method and JSON body", async () => {
    const mockJson = vi.fn().mockResolvedValue({ updated: true });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.put("/api/items/1", { name: "Updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      })
    );
  });

  it("calls fetch with PUT and no body when undefined", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.put("/api/items/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items/1",
      expect.objectContaining({ method: "PUT", body: undefined })
    );
  });
});

describe("createServerFetch - delete", () => {
  it("calls fetch with DELETE method", async () => {
    const mockJson = vi.fn().mockResolvedValue(undefined);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.delete("/api/items/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("createServerFetch - baseUrl", () => {
  it("prepends baseUrl to URLs", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.get("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/test",
      expect.anything()
    );
  });

  it("prepends baseUrl for POST requests", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch({ baseUrl: "http://localhost:3000" });
    await client.post("/api/test", {});

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/test",
      expect.anything()
    );
  });

  it("uses empty string baseUrl by default", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.anything()
    );
  });
});

describe("createServerFetch - error handling", () => {
  it("throws ApiError on 401 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();

    await expect(client.get("/api/protected")).rejects.toThrow(ApiError);
    await expect(client.get("/api/protected")).rejects.toThrow("Unauthorized");
  });

  it("throws ApiError with status and message on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();

    try {
      await client.get("/api/fail");
    } catch (e) {
      expect((e as ApiError).status).toBe(500);
      expect((e as ApiError).message).toBe("Server error");
    }
  });

  it("falls back to statusText when json has no error field", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();

    try {
      await client.get("/api/fail");
    } catch (e) {
      expect((e as ApiError).message).toBe("Bad Gateway");
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

    const client = createServerFetch();

    try {
      await client.get("/api/fail");
    } catch (e) {
      expect((e as ApiError).status).toBe(502);
      expect((e as ApiError).message).toBe("Bad Gateway");
    }
  });

  it("throws ApiError on POST 401", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await expect(client.post("/api/test", {})).rejects.toThrow("Unauthorized");
  });

  it("throws ApiError on PUT non-ok", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: vi.fn().mockResolvedValue({ error: "Forbidden" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await expect(client.put("/api/test", {})).rejects.toThrow("Forbidden");
  });

  it("throws ApiError on DELETE non-ok", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: vi.fn().mockResolvedValue({ error: "Not found" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await expect(client.delete("/api/test")).rejects.toThrow("Not found");
  });

  it("stores response body in ApiError", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: vi.fn().mockResolvedValue({
        error: "Validation failed",
        details: { name: ["required"] },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();

    try {
      await client.post("/api/test", {});
    } catch (e) {
      expect((e as ApiError).body).toEqual({
        error: "Validation failed",
        details: { name: ["required"] },
      });
    }
  });
});
