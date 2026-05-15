import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/lib/auth/guard", () => ({
  requireAuth: vi.fn(),
}));

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

import { requireAuth } from "@/lib/auth/guard";
import { apiFetch } from "@/lib/api-client";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function setAuth(session: typeof mockSession | null) {
  if (session) {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
  } else {
    (requireAuth as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  }
}

function mockApiFetch(deals: any[] = [], deliverables: any[] = [], payments: any[] = []) {
  (apiFetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === "/api/deals") return Promise.resolve({ deals });
    if (url === "/api/deliverables") return Promise.resolve({ deliverables });
    if (url === "/api/payments") return Promise.resolve({ payments });
    return Promise.resolve({});
  });
}

const emptyDashboard = {
  deals: [],
  deliverables: [],
  payments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dashboard auth flow - server-side redirect", () => {
  it("redirects to /login when not authenticated", async () => {
    setAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(requireAuth).toHaveBeenCalled();
  });

  it("does not make fetch calls when unauthenticated", async () => {
    setAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("does not redirect when authenticated", async () => {
    setAuth(mockSession);
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    expect(result).toBeDefined();
  });
});

describe("Dashboard auth flow - server-side data fetching", () => {
  it("fetches all data sources for authenticated user", async () => {
    setAuth(mockSession);
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();

    expect(apiFetch).toHaveBeenCalledWith("/api/deals", expect.objectContaining({ method: "GET" }));
    expect(apiFetch).toHaveBeenCalledWith("/api/deliverables", expect.objectContaining({ method: "GET" }));
    expect(apiFetch).toHaveBeenCalledWith("/api/payments", expect.objectContaining({ method: "GET" }));
  });

  it("renders dashboard content after successful data fetch", async () => {
    setAuth(mockSession);
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("renders dashboard with deal data", async () => {
    setAuth(mockSession);
    mockApiFetch(
      [{ id: "d1", status: "active", sponsorName: "Test", title: "Test Deal", totalValue: 1000, currency: "USD", endDate: null }],
      [],
      []
    );
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Active Deals")).toBeInTheDocument();
    });
  });
});

describe("Dashboard auth flow - error propagation", () => {
  it("propagates API errors from deals endpoint", async () => {
    setAuth(mockSession);
    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/deals") return Promise.reject(new Error("Database connection failed"));
      if (url === "/api/deliverables") return Promise.resolve({ deliverables: [] });
      if (url === "/api/payments") return Promise.resolve({ payments: [] });
      return Promise.resolve({});
    });

    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Database connection failed");
  });
});

describe("Dashboard auth flow - session validation", () => {
  it("redirects when requireAuth throws for unauthenticated user", async () => {
    setAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(requireAuth).toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("makes API calls with valid session user id", async () => {
    setAuth({ user: { id: "valid-id", email: "test@test.com", name: "Valid User" } });
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();
    expect(apiFetch).toHaveBeenCalledTimes(3);
  });

  it("handles session with only user id", async () => {
    setAuth({ user: { id: "u" } } as any);
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    expect(result).toBeDefined();
    expect(apiFetch).toHaveBeenCalled();
  });
});
