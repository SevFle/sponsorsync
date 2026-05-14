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

  it("accepts session with whitespace id (truthy)", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "  " } });

    const result = await getAuthenticatedSession();
    expect(result).toEqual({ user: { id: "  " } });
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

  it("returns session with whitespace id (truthy)", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "  " } });

    const result = await requireAuth();
    expect(result).toEqual({ user: { id: "  " } });
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
});
