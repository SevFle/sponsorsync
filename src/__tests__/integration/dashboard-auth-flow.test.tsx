import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
    push: vi.fn(),
  })),
  usePathname: vi.fn(() => "/dashboard"),
}));

import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";

const mockSession = {
  user: { id: "user-1", email: "test@test.com", name: "Test User" },
};

function setAuth(authenticated: boolean) {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    session: authenticated ? mockSession : null,
    status: authenticated ? "authenticated" : "unauthenticated",
    isLoading: false,
    isAuthenticated: authenticated,
  });
}

function mockApiResponse(
  deals: any[] = [],
  deliverables: any[] = [],
  payments: any[] = []
) {
  const activeDeals = deals.filter((d: any) => d.status === "active").length;
  const draftDeals = deals.filter((d: any) => d.status === "draft").length;
  const completedDeals = deals.filter(
    (d: any) => d.status === "completed"
  ).length;
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

  (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    deals,
    deliverables,
    payments,
    metrics: {
      activeDeals,
      draftDeals,
      completedDeals,
      revenueMtd,
      pendingDeliverables,
      overduePayments,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dashboard auth flow - client-side auth guard", () => {
  it("renders nothing when unauthenticated", async () => {
    setAuth(false);
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    const { container } = render(<DashboardPage />);
    expect(container.innerHTML).toBe("");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("does not make fetch calls when unauthenticated", async () => {
    setAuth(false);
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("renders content when authenticated", async () => {
    setAuth(true);
    mockApiResponse();
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});

describe("Dashboard auth flow - centralized API fetch", () => {
  it("calls apiFetch with /api/dashboard endpoint", async () => {
    setAuth(true);
    mockApiResponse();
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/dashboard",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it("renders dashboard content after successful data fetch", async () => {
    setAuth(true);
    mockApiResponse();
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("renders dashboard with deal data", async () => {
    setAuth(true);
    mockApiResponse(
      [
        {
          id: "d1",
          status: "active",
          sponsorName: "Test",
          title: "Test Deal",
          totalValue: 1000,
          currency: "USD",
          endDate: null,
        },
      ],
      [],
      []
    );
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Deals")).toBeInTheDocument();
    });
  });
});

describe("Dashboard auth flow - error handling", () => {
  it("shows error banner on API failure", async () => {
    setAuth(true);
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Database connection failed")
      ).toBeInTheDocument();
    });
  });

  it("shows error banner for deliverable lookup failure", async () => {
    setAuth(true);
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Deliverables lookup failed")
    );
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Deliverables lookup failed")
      ).toBeInTheDocument();
    });
  });

  it("shows error banner for payments query failure", async () => {
    setAuth(true);
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Payments query failed")
    );
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Payments query failed")
      ).toBeInTheDocument();
    });
  });
});

describe("Dashboard auth flow - session validation", () => {
  it("renders nothing when useAuth returns unauthenticated", async () => {
    setAuth(false);
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    const { container } = render(<DashboardPage />);
    expect(container.innerHTML).toBe("");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("fetches data when session has valid user id", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      session: {
        user: { id: "valid-id", email: "test@test.com", name: "Valid User" },
      },
      status: "authenticated",
      isLoading: false,
      isAuthenticated: true,
    });
    mockApiResponse();
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("handles retry after error with valid session", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      session: {
        user: { id: "valid-id", email: "test@test.com", name: "Valid User" },
      },
      status: "authenticated",
      isLoading: false,
      isAuthenticated: true,
    });

    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Temporary error")
    );
    mockApiResponse();

    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/page"
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Temporary error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
