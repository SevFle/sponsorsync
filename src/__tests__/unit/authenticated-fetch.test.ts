import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedFetch, ApiError } from "@/lib/auth/authenticated-fetch";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
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

import { apiFetch } from "@/lib/api-client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAuthenticatedFetch - defaults", () => {
  it("creates a fetch client with no options", () => {
    const client = createAuthenticatedFetch();
    expect(client).toHaveProperty("get");
    expect(client).toHaveProperty("post");
    expect(client).toHaveProperty("put");
    expect(client).toHaveProperty("delete");
  });

  it("creates a fetch client with baseUrl", () => {
    const client = createAuthenticatedFetch({ baseUrl: "/api" });
    expect(client).toBeDefined();
  });

  it("creates a fetch client with defaultHeaders", () => {
    const client = createAuthenticatedFetch({ defaultHeaders: { "X-Custom": "test" } });
    expect(client).toBeDefined();
  });
});

describe("createAuthenticatedFetch - get", () => {
  it("calls apiFetch with GET method and correct URL", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: "test" });
    const client = createAuthenticatedFetch();

    const result = await client.get("/api/items");

    expect(apiFetch).toHaveBeenCalledWith("/api/items", expect.objectContaining({ method: "GET" }));
    expect(result).toEqual({ data: "test" });
  });

  it("prepends baseUrl to URL", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const client = createAuthenticatedFetch({ baseUrl: "/api/v2" });

    await client.get("/items");

    expect(apiFetch).toHaveBeenCalledWith("/api/v2/items", expect.anything());
  });

  it("passes params to apiFetch", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const client = createAuthenticatedFetch();

    await client.get("/items", { page: "1", limit: "10" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/items",
      expect.objectContaining({ method: "GET", params: { page: "1", limit: "10" } })
    );
  });

  it("includes defaultHeaders in request", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const client = createAuthenticatedFetch({ defaultHeaders: { "X-App": "test" } });

    await client.get("/items");

    expect(apiFetch).toHaveBeenCalledWith(
      "/items",
      expect.objectContaining({ headers: { "X-App": "test" } })
    );
  });

  it("returns typed response", async () => {
    interface Item { id: string; name: string }
    const items: Item[] = [{ id: "1", name: "Test" }];
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(items);
    const client = createAuthenticatedFetch();

    const result = await client.get<Item[]>("/items");

    expect(result).toEqual(items);
  });
});

describe("createAuthenticatedFetch - post", () => {
  it("calls apiFetch with POST method and JSON body", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "1" });
    const client = createAuthenticatedFetch();

    await client.post("/api/items", { name: "New Item" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "New Item" }),
      })
    );
  });

  it("calls apiFetch with POST and no body", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const client = createAuthenticatedFetch();

    await client.post("/api/action");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/action",
      expect.objectContaining({ method: "POST", body: undefined })
    );
  });

  it("prepends baseUrl for POST requests", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const client = createAuthenticatedFetch({ baseUrl: "/api" });

    await client.post("/items", { name: "test" });

    expect(apiFetch).toHaveBeenCalledWith("/api/items", expect.anything());
  });

  it("includes defaultHeaders in POST request", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const client = createAuthenticatedFetch({ defaultHeaders: { Authorization: "Bearer token" } });

    await client.post("/items", {});

    expect(apiFetch).toHaveBeenCalledWith(
      "/items",
      expect.objectContaining({ headers: { Authorization: "Bearer token" } })
    );
  });
});

describe("createAuthenticatedFetch - put", () => {
  it("calls apiFetch with PUT method and JSON body", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ updated: true });
    const client = createAuthenticatedFetch();

    await client.put("/api/items/1", { name: "Updated" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/items/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      })
    );
  });

  it("calls apiFetch with PUT and no body", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const client = createAuthenticatedFetch();

    await client.put("/api/items/1");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/items/1",
      expect.objectContaining({ method: "PUT", body: undefined })
    );
  });

  it("prepends baseUrl for PUT requests", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const client = createAuthenticatedFetch({ baseUrl: "/api" });

    await client.put("/items/1", {});

    expect(apiFetch).toHaveBeenCalledWith("/api/items/1", expect.anything());
  });
});

describe("createAuthenticatedFetch - delete", () => {
  it("calls apiFetch with DELETE method", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const client = createAuthenticatedFetch();

    await client.delete("/api/items/1");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/items/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("prepends baseUrl for DELETE requests", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const client = createAuthenticatedFetch({ baseUrl: "/api" });

    await client.delete("/items/1");

    expect(apiFetch).toHaveBeenCalledWith("/api/items/1", expect.anything());
  });

  it("includes defaultHeaders in DELETE request", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const client = createAuthenticatedFetch({ defaultHeaders: { "X-Token": "abc" } });

    await client.delete("/items/1");

    expect(apiFetch).toHaveBeenCalledWith(
      "/items/1",
      expect.objectContaining({ headers: { "X-Token": "abc" } })
    );
  });
});

describe("createAuthenticatedFetch - error propagation", () => {
  it("propagates ApiError from apiFetch on GET", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(404, "Not found")
    );
    const client = createAuthenticatedFetch();

    await expect(client.get("/missing")).rejects.toThrow("Not found");
  });

  it("propagates ApiError from apiFetch on POST", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(422, "Validation failed")
    );
    const client = createAuthenticatedFetch();

    await expect(client.post("/items", {})).rejects.toThrow("Validation failed");
  });

  it("propagates ApiError from apiFetch on PUT", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(403, "Forbidden")
    );
    const client = createAuthenticatedFetch();

    await expect(client.put("/items/1", {})).rejects.toThrow("Forbidden");
  });

  it("propagates ApiError from apiFetch on DELETE", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(401, "Unauthorized")
    );
    const client = createAuthenticatedFetch();

    await expect(client.delete("/items/1")).rejects.toThrow("Unauthorized");
  });
});

describe("createAuthenticatedFetch - concurrent requests", () => {
  it("supports multiple concurrent GET requests", async () => {
    (apiFetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: "d1" }])
      .mockResolvedValueOnce([{ id: "dl1" }])
      .mockResolvedValueOnce([{ id: "p1" }]);

    const client = createAuthenticatedFetch({ baseUrl: "/api" });

    const [deals, deliverables, payments] = await Promise.all([
      client.get("/deals"),
      client.get("/deliverables"),
      client.get("/payments"),
    ]);

    expect(deals).toEqual([{ id: "d1" }]);
    expect(deliverables).toEqual([{ id: "dl1" }]);
    expect(payments).toEqual([{ id: "p1" }]);
    expect(apiFetch).toHaveBeenCalledTimes(3);
  });
});
