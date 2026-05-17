import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getServerSessionOrNull, getAuthenticatedSession, requireAuth } from "@/lib/auth/guard";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getServerSessionOrNull", () => {
  it("returns session when authenticated", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    const result = await getServerSessionOrNull();
    expect(result).toEqual(mockSession);
  });

  it("returns null when session is null", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getServerSessionOrNull();
    expect(result).toBeNull();
  });

  it("returns session when session has user but no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} });

    const result = await getServerSessionOrNull();
    expect(result).toEqual({ user: {} });
  });

  it("returns session when session has user with id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    const result = await getServerSessionOrNull();
    expect(result).toEqual(mockSession);
  });

  it("calls getServerSession with authOptions", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    await getServerSessionOrNull();
    expect(getServerSession).toHaveBeenCalledWith({});
  });

  it("returns null when session is undefined", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined as any);

    const result = await getServerSessionOrNull();
    expect(result).toBeNull();
  });

  it("returns session when session has expires field", async () => {
    const sessionWithExpires = { ...mockSession, expires: "2025-12-31T23:59:59.000Z" };
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sessionWithExpires);

    const result = await getServerSessionOrNull();
    expect(result).toEqual(sessionWithExpires);
  });

  it("returns session with minimal user object", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1" } });

    const result = await getServerSessionOrNull();
    expect(result).toEqual({ user: { id: "u1" } });
  });

  it("propagates getServerSession errors", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Auth service down"));

    await expect(getServerSessionOrNull()).rejects.toThrow("Auth service down");
  });

  it("returns session even when user id is numeric (not its job to validate)", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 42 } } as any);

    const result = await getServerSessionOrNull();
    expect(result).toEqual({ user: { id: 42 } });
  });
});

describe("getAuthenticatedSession", () => {
  it("returns session when user has id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    const result = await getAuthenticatedSession();
    expect(result).toEqual(mockSession);
  });

  it("returns null when session is null", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session has user but no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} });

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session has empty string id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "" } });

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session is undefined", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session is empty object", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({} as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("calls getServerSession with authOptions", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    await getAuthenticatedSession();
    expect(getServerSession).toHaveBeenCalledWith({});
  });

  it("returns null when session has whitespace-only id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "  " } });

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id is a number", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 123 } } as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id is zero", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 0 } } as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id is boolean", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: true } } as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id is an object", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: { value: "x" } } } as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id is an array", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: ["user-1"] } } as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user is null", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: null } as any);

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id has only tabs", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "\t\t" } });

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id has only newlines", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "\n\r\n" } });

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("returns null when session user id is mixed whitespace", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: " \t\n " } });

    const result = await getAuthenticatedSession();
    expect(result).toBeNull();
  });

  it("accepts session with valid id that has surrounding whitespace", async () => {
    const sessionWithPaddedId = { user: { id: " user-1 ", email: "test@test.com" } };
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sessionWithPaddedId);

    const result = await getAuthenticatedSession();
    expect(result).toEqual(sessionWithPaddedId);
  });

  it("propagates getServerSession errors", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    await expect(getAuthenticatedSession()).rejects.toThrow("Network error");
  });
});

describe("requireAuth", () => {
  it("returns session when user is authenticated", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    const result = await requireAuth();
    expect(result).toEqual(mockSession);
  });

  it("redirects to /login when session is null", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session has no user", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({} as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user has no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user has empty string id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "" } } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session has whitespace-only id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "  " } });

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("calls getServerSession with authOptions", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    await requireAuth();
    expect(getServerSession).toHaveBeenCalledWith({});
  });

  it("does not redirect when session is valid", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    await requireAuth();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("propagates getServerSession errors", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Session lookup failed")
    );

    await expect(requireAuth()).rejects.toThrow("Session lookup failed");
  });

  it("redirects to /login when session user has numeric id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 123 } } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user is explicitly null", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: null } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user id is boolean true", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: true } } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user id is an object", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: { value: "user-1" } } } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user id is an array", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: ["user-1"] } } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user id has only tabs", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "\t\t" } });

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user id has only newlines", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "\n\n" } });

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session user id is zero", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 0 } } as any);

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("accepts session with valid id after previously rejecting", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");

    vi.clearAllMocks();
    vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });

    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
    const result = await requireAuth();
    expect(result).toEqual(mockSession);
    expect(redirect).not.toHaveBeenCalled();
  });
});
