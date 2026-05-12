import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { getServerSessionOrNull, getAuthenticatedSession } from "@/lib/auth/guard";

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
