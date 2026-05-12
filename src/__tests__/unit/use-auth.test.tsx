import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

import { useSession } from "next-auth/react";

function mockAuthenticatedSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { user: { id: "user-1", email: "test@test.com" } },
    status: "authenticated",
  });
}

function mockUnauthenticatedSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "unauthenticated",
  });
}

function mockLoadingSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "loading",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAuth - return values", () => {
  it("returns isAuthenticated true when session is authenticated", () => {
    mockAuthenticatedSession();
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBe("authenticated");
  });

  it("returns isLoading true when session is loading", () => {
    mockLoadingSession();
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.status).toBe("loading");
  });

  it("returns both false when session is unauthenticated", () => {
    mockUnauthenticatedSession();
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBe("unauthenticated");
  });

  it("returns session data when authenticated", () => {
    const sessionData = { user: { id: "user-1", email: "test@test.com" } };
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: sessionData,
      status: "authenticated",
    });
    const { result } = renderHook(() => useAuth());
    expect(result.current.session).toEqual(sessionData);
  });

  it("returns null session when unauthenticated", () => {
    mockUnauthenticatedSession();
    const { result } = renderHook(() => useAuth());
    expect(result.current.session).toBeNull();
  });

  it("returns null session when loading", () => {
    mockLoadingSession();
    const { result } = renderHook(() => useAuth());
    expect(result.current.session).toBeNull();
  });
});

describe("useAuth - redirect behavior", () => {
  it("redirects to /login by default when unauthenticated", async () => {
    mockUnauthenticatedSession();
    renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not redirect when authenticated", async () => {
    mockAuthenticatedSession();
    renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when session is loading", async () => {
    mockLoadingSession();
    renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("supports custom redirect path", async () => {
    mockUnauthenticatedSession();
    renderHook(() => useAuth({ redirectTo: "/signin" }));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/signin");
    });
  });

  it("uses router.replace not router.push for redirect", async () => {
    mockUnauthenticatedSession();
    renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("redirects only once when status changes from loading to unauthenticated", async () => {
    mockLoadingSession();
    const { rerender } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();

    mockUnauthenticatedSession();
    rerender();

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });
});

describe("useAuth - integration with api-client pattern", () => {
  it("provides isAuthenticated for conditional fetch guards", () => {
    mockAuthenticatedSession();
    const { result } = renderHook(() => useAuth());

    const shouldFetch = result.current.isAuthenticated;
    expect(shouldFetch).toBe(true);
  });

  it("blocks fetch when not authenticated", () => {
    mockLoadingSession();
    const { result } = renderHook(() => useAuth());

    const shouldFetch = result.current.isAuthenticated;
    expect(shouldFetch).toBe(false);
  });
});
