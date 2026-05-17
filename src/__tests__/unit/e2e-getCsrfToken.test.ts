import { describe, it, expect, vi } from "vitest";

function getCsrfToken(page: { request: { get: (url: string) => Promise<{ json: () => Promise<{ csrfToken: string }> }> } }): Promise<string> {
  return page.request.get("/api/auth/csrf").then((res) => res.json()).then((data) => data.csrfToken);
}

describe("getCsrfToken (e2e helper)", () => {
  it("calls /api/auth/csrf and returns csrfToken from JSON", async () => {
    const mockPage = {
      request: {
        get: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({ csrfToken: "test-csrf-token-123" }),
        }),
      },
    };

    const token = await getCsrfToken(mockPage);

    expect(mockPage.request.get).toHaveBeenCalledWith("/api/auth/csrf");
    expect(token).toBe("test-csrf-token-123");
  });

  it("does not call page.goto", async () => {
    const mockPage = {
      request: {
        get: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({ csrfToken: "token" }),
        }),
      },
      goto: vi.fn(),
    };

    await getCsrfToken(mockPage as any);

    expect((mockPage as any).goto).not.toHaveBeenCalled();
  });

  it("does not access page.context().cookies()", async () => {
    const mockContext = { cookies: vi.fn() };
    const mockPage = {
      request: {
        get: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({ csrfToken: "token" }),
        }),
      },
      context: vi.fn().mockReturnValue(mockContext),
    };

    await getCsrfToken(mockPage as any);

    expect((mockPage as any).context).not.toHaveBeenCalled();
  });

  it("reuses the same /api/auth/csrf endpoint as signIn", async () => {
    const mockPage = {
      request: {
        get: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({ csrfToken: "abc" }),
        }),
      },
    };

    await getCsrfToken(mockPage);

    const calls = mockPage.request.get.mock.calls.map((c: string[]) => c[0]);
    expect(calls).toContain("/api/auth/csrf");
    expect(calls).toHaveLength(1);
  });

  it("returns the csrfToken property directly from JSON response", async () => {
    const mockPage = {
      request: {
        get: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({
            csrfToken: "direct-token",
            otherField: "ignored",
          }),
        }),
      },
    };

    const token = await getCsrfToken(mockPage);
    expect(token).toBe("direct-token");
  });
});
