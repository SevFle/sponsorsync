import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("createAuthenticatedFetch - CSRF token integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = "";
  });

  afterEach(() => {
    document.cookie = "csrfToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("includes CSRF token from cookie in GET request headers", async () => {
    document.cookie = "csrfToken=test-csrf-token-123; path=/";
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: "ok" });

    const client = createAuthenticatedFetch();
    await client.get("/api/dashboard");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/dashboard",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-CSRF-Token": "test-csrf-token-123",
        }),
      })
    );
  });

  it("includes CSRF token from cookie in POST request headers", async () => {
    document.cookie = "csrfToken=my-post-token; path=/";
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "1" });

    const client = createAuthenticatedFetch();
    await client.post("/api/deals", { name: "New Deal" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/deals",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-CSRF-Token": "my-post-token",
        }),
      })
    );
  });

  it("includes CSRF token from cookie in PUT request headers", async () => {
    document.cookie = "csrfToken=put-token-abc; path=/";
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ updated: true });

    const client = createAuthenticatedFetch();
    await client.put("/api/deals/1", { name: "Updated" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/deals/1",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "X-CSRF-Token": "put-token-abc",
        }),
      })
    );
  });

  it("includes CSRF token from cookie in DELETE request headers", async () => {
    document.cookie = "csrfToken=delete-token-xyz; path=/";
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const client = createAuthenticatedFetch();
    await client.delete("/api/deals/1");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/deals/1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "X-CSRF-Token": "delete-token-xyz",
        }),
      })
    );
  });

  it("does not include CSRF header when no cookie is present", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const client = createAuthenticatedFetch();
    await client.get("/api/items");

    const callArgs = (apiFetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("merges CSRF token with custom defaultHeaders", async () => {
    document.cookie = "csrfToken=merged-token; path=/";
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const client = createAuthenticatedFetch({
      defaultHeaders: { "X-Custom": "value" },
    });
    await client.get("/api/items");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-CSRF-Token": "merged-token",
          "X-Custom": "value",
        }),
      })
    );
  });

  it("handles CSRF cookie with special characters", async () => {
    document.cookie = "csrfToken=abc%20def; path=/";
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const client = createAuthenticatedFetch();
    await client.get("/api/items");

    const callArgs = (apiFetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers["X-CSRF-Token"]).toBe("abc def");
  });

  it("reads updated CSRF token on each request", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const client = createAuthenticatedFetch();

    document.cookie = "csrfToken=token-v1; path=/";
    await client.get("/api/items");

    document.cookie = "csrfToken=token-v2; path=/";
    await client.get("/api/items");

    const call1 = (apiFetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const call2 = (apiFetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(call1[1].headers["X-CSRF-Token"]).toBe("token-v1");
    expect(call2[1].headers["X-CSRF-Token"]).toBe("token-v2");
  });
});
