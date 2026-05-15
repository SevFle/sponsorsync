import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookiesGetAll = vi.fn();
const mockCookiesGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: mockCookiesGetAll,
      get: mockCookiesGet,
    })
  ),
}));

vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: Record<string, unknown>;
    constructor(status: number, message: string, body: Record<string, unknown> = {}) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

import { createServerFetch, ApiError } from "@/lib/auth/server-fetch";

beforeEach(() => {
  vi.restoreAllMocks();
  mockCookiesGetAll.mockReturnValue([]);
  mockCookiesGet.mockReturnValue(undefined);
});

describe("createServerFetch - cookie forwarding", () => {
  it("forwards all cookies in Cookie header", async () => {
    mockCookiesGetAll.mockReturnValue([
      { name: "next-auth.session-token", value: "sess123" },
      { name: "csrfToken", value: "csrf456" },
    ]);
    mockCookiesGet.mockReturnValue({ value: "csrf456" });

    const mockJson = vi.fn().mockResolvedValue({ data: "test" });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers).toEqual(
      expect.objectContaining({
        Cookie: "next-auth.session-token=sess123; csrfToken=csrf456",
      })
    );
  });

  it("sends X-CSRF-Token header when csrfToken cookie is present", async () => {
    mockCookiesGetAll.mockReturnValue([
      { name: "csrfToken", value: "mytoken" },
    ]);
    mockCookiesGet.mockReturnValue({ value: "mytoken" });

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers).toEqual(
      expect.objectContaining({ "X-CSRF-Token": "mytoken" })
    );
  });

  it("omits X-CSRF-Token when no csrfToken cookie", async () => {
    mockCookiesGetAll.mockReturnValue([]);
    mockCookiesGet.mockReturnValue(undefined);

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("sends empty Cookie header when no cookies exist", async () => {
    mockCookiesGetAll.mockReturnValue([]);

    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers).toEqual(
      expect.objectContaining({ Cookie: "" })
    );
  });
});

describe("createServerFetch - headers", () => {
  it("sends Content-Type application/json by default", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/test");

    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/json" })
    );
  });
});

describe("createServerFetch - get", () => {
  it("makes GET request", async () => {
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

  it("prepends baseUrl to URL", async () => {
    const mockJson = vi.fn().mockResolvedValue([]);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch({ baseUrl: "/api/v2" });
    await client.get("/items");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v2/items",
      expect.anything()
    );
  });

  it("appends params as query string", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.get("/api/items", { page: "2", limit: "10" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items?page=2&limit=10",
      expect.anything()
    );
  });

  it("returns typed response", async () => {
    interface Item {
      id: string;
      name: string;
    }
    const items: Item[] = [{ id: "1", name: "Test" }];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(items),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    const result = await client.get<Item[]>("/items");

    expect(result).toEqual(items);
  });
});

describe("createServerFetch - post", () => {
  it("makes POST request with JSON body", async () => {
    const mockJson = vi.fn().mockResolvedValue({ id: "1" });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();
    await client.post("/api/items", { name: "New Item" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "New Item" }),
      })
    );
  });

  it("makes POST request with no body", async () => {
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

  it("prepends baseUrl for POST", async () => {
    const mockJson = vi.fn().mockResolvedValue({});
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch({ baseUrl: "/api" });
    await client.post("/items", { name: "test" });

    expect(mockFetch).toHaveBeenCalledWith("/api/items", expect.anything());
  });
});

describe("createServerFetch - put", () => {
  it("makes PUT request with JSON body", async () => {
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

  it("makes PUT request with no body", async () => {
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
  it("makes DELETE request", async () => {
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

  it("prepends baseUrl for DELETE", async () => {
    const mockJson = vi.fn().mockResolvedValue(undefined);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch({ baseUrl: "/api" });
    await client.delete("/items/1");

    expect(mockFetch).toHaveBeenCalledWith("/api/items/1", expect.anything());
  });
});

describe("createServerFetch - error handling", () => {
  it("throws ApiError on 401 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();

    await expect(client.get("/api/protected")).rejects.toThrow(ApiError);
    await expect(client.get("/api/protected")).rejects.toThrow("Unauthorized");
  });

  it("throws ApiError on non-ok response with error body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: vi.fn().mockResolvedValue({ error: "Not found" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();

    try {
      await client.get("/api/missing");
    } catch (e) {
      expect((e as ApiError).status).toBe(404);
      expect((e as ApiError).message).toBe("Not found");
    }
  });

  it("throws ApiError with status code 500", async () => {
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

    const client = createServerFetch();

    try {
      await client.get("/api/fail");
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

    const client = createServerFetch();

    try {
      await client.get("/api/fail");
    } catch (e) {
      expect((e as ApiError).status).toBe(502);
      expect((e as ApiError).message).toBe("Bad Gateway");
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

    const client = createServerFetch();

    try {
      await client.get("/api/forbidden");
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }
  });

  it("stores response body in ApiError", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: vi.fn().mockResolvedValue({
        error: "Validation failed",
        details: { name: ["is required"] },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch();

    try {
      await client.get("/api/validate");
    } catch (e) {
      expect((e as ApiError).body).toEqual({
        error: "Validation failed",
        details: { name: ["is required"] },
      });
    }
  });
});

describe("createServerFetch - concurrent requests", () => {
  it("supports multiple concurrent GET requests", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "d1" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "dl1" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "p1" }]),
      });

    vi.stubGlobal("fetch", mockFetch);

    const client = createServerFetch({ baseUrl: "/api" });

    const [deals, deliverables, payments] = await Promise.all([
      client.get("/deals"),
      client.get("/deliverables"),
      client.get("/payments"),
    ]);

    expect(deals).toEqual([{ id: "d1" }]);
    expect(deliverables).toEqual([{ id: "dl1" }]);
    expect(payments).toEqual([{ id: "p1" }]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe("createServerFetch - interface", () => {
  it("returns object with get, post, put, delete methods", () => {
    const client = createServerFetch();
    expect(client).toHaveProperty("get");
    expect(client).toHaveProperty("post");
    expect(client).toHaveProperty("put");
    expect(client).toHaveProperty("delete");
  });

  it("creates a fetch client with no options", () => {
    const client = createServerFetch();
    expect(client).toBeDefined();
  });

  it("creates a fetch client with baseUrl", () => {
    const client = createServerFetch({ baseUrl: "/api" });
    expect(client).toBeDefined();
  });
});
