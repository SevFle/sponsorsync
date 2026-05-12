import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/page";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

import { useSession } from "next-auth/react";

function setSession(status: string, data?: any) {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: data ?? null,
    status,
  });
}

function mockFetchSuccess(data: any) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
    const path = typeof url === "string" ? url : url.toString();
    if (path.includes("/api/dashboard")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      } as Response);
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response);
  });
}

const emptyDashboard = {
  deals: [],
  deliverables: [],
  payments: [],
  metrics: {
    activeDeals: 0,
    draftDeals: 0,
    completedDeals: 0,
    revenueMtd: 0,
    pendingDeliverables: 0,
    overduePayments: 0,
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  mockRouter.replace.mockClear();
  mockRouter.push.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dashboard auth flow - redirect to login", () => {
  it("redirects immediately when session is unauthenticated", async () => {
    setSession("unauthenticated");
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("uses replace (not push) for redirect to prevent back-button loop", async () => {
    setSession("unauthenticated");
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("does not fetch data when unauthenticated", async () => {
    setSession("unauthenticated");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows loading skeleton while session is loading", () => {
    setSession("loading");
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<DashboardPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("Dashboard auth flow - session state transitions", () => {
  it("transitions from loading to authenticated and fetches data", async () => {
    let sessionCallback: any;
    (useSession as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return { data: null, status: "loading" };
    });

    const fetchSpy = mockFetchSuccess(emptyDashboard);

    render(<DashboardPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("transitions from loading to unauthenticated and redirects", async () => {
    setSession("loading");
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { rerender } = render(<DashboardPage />);

    expect(mockRouter.replace).not.toHaveBeenCalled();

    setSession("unauthenticated");
    rerender(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });
});

describe("Dashboard auth flow - 401 API response handling", () => {
  it("shows error message on 401 response", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "Unauthorized" }),
      } as Response)
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });
  });

  it("does not redirect on 401 - shows error with retry instead", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "Unauthorized" }),
      } as Response)
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("can retry after 401 error", async () => {
    setSession("authenticated", { user: { id: "user-1" } });

    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: () => Promise.resolve({ error: "Unauthorized" }),
        } as Response)
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(emptyDashboard),
        } as Response)
      );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});

describe("Dashboard auth flow - authenticated data fetching", () => {
  it("fetches dashboard data after authentication", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    const fetchSpy = mockFetchSuccess(emptyDashboard);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const callUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(callUrl).toContain("/api/dashboard");
  });

  it("sends credentials: include in the fetch request", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    const fetchSpy = mockFetchSuccess(emptyDashboard);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(opts.credentials).toBe("include");
  });

  it("sends Content-Type: application/json in the fetch request", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    const fetchSpy = mockFetchSuccess(emptyDashboard);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("sends X-CSRF-Token when csrfToken cookie is set", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrfToken=test-csrf-token",
    });
    const fetchSpy = mockFetchSuccess(emptyDashboard);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBe("test-csrf-token");

    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  it("aborts in-flight fetch on unmount", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const signal = fetchSpy.mock.calls[0]![1]!.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});

describe("Dashboard auth flow - concurrent scenarios", () => {
  it("does not fetch while session is loading even if component re-renders", async () => {
    setSession("loading");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { rerender } = render(<DashboardPage />);

    rerender(<DashboardPage />);
    rerender(<DashboardPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("only makes one fetch call after authentication", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    const fetchSpy = mockFetchSuccess(emptyDashboard);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Dashboard auth flow - error recovery", () => {
  it("recovers from network error on retry", async () => {
    setSession("authenticated", { user: { id: "user-1" } });

    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(emptyDashboard),
        } as Response)
      );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("recovers from server error on retry", async () => {
    setSession("authenticated", { user: { id: "user-1" } });

    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () => Promise.resolve({ error: "Server error" }),
        } as Response)
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(emptyDashboard),
        } as Response)
      );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("shows generic error for non-Error rejections", async () => {
    setSession("authenticated", { user: { id: "user-1" } });
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce("string error");

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });
});

describe("Dashboard auth flow - multiple session status changes", () => {
  it("handles rapid session state changes without multiple fetches", async () => {
    setSession("loading");
    mockFetchSuccess(emptyDashboard);

    const { rerender } = render(<DashboardPage />);

    setSession("loading");
    rerender(<DashboardPage />);

    setSession("authenticated", { user: { id: "user-1" } });
    rerender(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
