import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

vi.mock("@/hooks/useDateRange", () => ({
  useDateRange: () => ({ range: "30d", setRange: vi.fn() }),
}));

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    revenue: null,
    pipeline: null,
    deliverables: null,
    trends: null,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/dashboard/DateRangePicker", () => ({
  DateRangePicker: () => <div data-testid="date-range-picker" />,
}));

vi.mock("@/components/dashboard/RevenueChart", () => ({
  RevenueChart: () => <div />,
}));

vi.mock("@/components/dashboard/PipelineFunnel", () => ({
  PipelineFunnel: () => <div />,
}));

vi.mock("@/components/dashboard/DeliverableStatusGrid", () => ({
  DeliverableStatusGrid: () => <div />,
}));

vi.mock("@/components/dashboard/TrendLineChart", () => ({
  TrendLineChart: () => <div />,
}));

vi.mock("@/components/dashboard/MetricCardEnhanced", () => ({
  MetricCardEnhanced: () => <div />,
}));

vi.mock("@/lib/format", () => ({
  formatCurrency: (n: number) => `$${n}`,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    status: "authenticated",
    session: { user: { id: "user-1" } },
  });
});

describe("AnalyticsPage - auth guard", () => {
  it("renders analytics content when authenticated", async () => {
    const { default: AnalyticsPage } = await import(
      "@/app/(dashboard)/analytics/page"
    );

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Analytics")).toBeInTheDocument();
    });
  });

  it("shows spinner when auth is loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      status: "loading",
      session: null,
    });

    const { default: AnalyticsPage } = await import(
      "@/app/(dashboard)/analytics/page"
    );

    render(<AnalyticsPage />);

    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });

  it("shows spinner when unauthenticated (redirect handled by useAuth)", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      status: "unauthenticated",
      session: null,
    });

    const { default: AnalyticsPage } = await import(
      "@/app/(dashboard)/analytics/page"
    );

    render(<AnalyticsPage />);

    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });
});
