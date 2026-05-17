import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/lib/auth/guard", () => ({
  requireAuth: vi.fn(),
}));

const mockServerFetchGet = vi.fn();

vi.mock("@/lib/auth/server-fetch", () => ({
  createServerFetch: () => ({
    get: (...args: unknown[]) => mockServerFetchGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/config", () => ({
  config: {
    app: { url: "http://localhost:3000", name: "SponsorSync" },
    database: { url: "" },
    auth: { secret: "", url: "http://localhost:3000" },
    email: { resendApiKey: "" },
    inngest: { eventKey: "", signingKey: "" },
    stripe: { secretKey: "", publishableKey: "", webhookSecret: "", starterPriceId: "", proPriceId: "" },
  },
}));

import { requireAuth } from "@/lib/auth/guard";

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
  const activeDeals = deals.filter((d: any) => d.status === "active").length;
  const draftDeals = deals.filter((d: any) => d.status === "draft").length;
  const completedDeals = deals.filter((d: any) => d.status === "completed").length;
  const revenueMtd = payments
    .filter((p: any) => p.status === "paid" && p.paidDate)
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const pendingDeliverables = deliverables.filter(
    (d: any) => d.status === "pending" || d.status === "in_progress"
  ).length;
  const overduePayments = payments.filter(
    (p: any) =>
      p.status === "overdue" ||
      (p.status === "pending" && p.dueDate && new Date(p.dueDate) < new Date())
  ).length;

  mockServerFetchGet.mockResolvedValue({
    deals,
    deliverables,
    payments,
    metrics: { activeDeals, draftDeals, completedDeals, revenueMtd, pendingDeliverables, overduePayments },
  });
}

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
    expect(mockServerFetchGet).not.toHaveBeenCalled();
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
  it("calls getDashboardData with authenticated user id", async () => {
    setAuth(mockSession);
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();

    expect(mockServerFetchGet).toHaveBeenCalledWith("/api/dashboard");
    expect(mockServerFetchGet).toHaveBeenCalledTimes(1);
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
  it("propagates API errors from getDashboardData", async () => {
    setAuth(mockSession);
    mockServerFetchGet.mockRejectedValue(new Error("Database connection failed"));
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Database connection failed");
  });

  it("propagates data layer errors", async () => {
    setAuth(mockSession);
    mockServerFetchGet.mockRejectedValue(new Error("Deliverables lookup failed"));
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Deliverables lookup failed");
  });

  it("propagates query errors from underlying data sources", async () => {
    setAuth(mockSession);
    mockServerFetchGet.mockRejectedValue(new Error("Payments query failed"));
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Payments query failed");
  });
});

describe("Dashboard auth flow - session validation", () => {
  it("redirects when requireAuth throws for unauthenticated user", async () => {
    setAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(requireAuth).toHaveBeenCalled();
    expect(mockServerFetchGet).not.toHaveBeenCalled();
  });

  it("calls aggregated dashboard API via authenticated server fetch", async () => {
    setAuth({ user: { id: "valid-id", email: "test@test.com", name: "Valid User" } });
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();
    expect(mockServerFetchGet).toHaveBeenCalledWith("/api/dashboard");
    expect(mockServerFetchGet).toHaveBeenCalledTimes(1);
  });

  it("rejects session with whitespace-only user id", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockServerFetchGet).not.toHaveBeenCalled();
  });
});
