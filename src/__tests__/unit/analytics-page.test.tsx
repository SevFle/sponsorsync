import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockUseAuth = vi.fn();
const mockUseAnalytics = vi.fn();
const mockSetRange = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

vi.mock("@/hooks/useDateRange", () => ({
  useDateRange: () => ({ range: "30d", setRange: mockSetRange }),
}));

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: (...args: unknown[]) => mockUseAnalytics(...args),
}));

vi.mock("@/components/dashboard/DateRangePicker", () => ({
  DateRangePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div data-testid="date-range-picker" data-value={value} onClick={() => onChange("7d")} />
  ),
}));

vi.mock("@/components/dashboard/RevenueChart", () => ({
  RevenueChart: ({ data }: { data: unknown[] }) => <div data-testid="revenue-chart" data-count={data.length} />,
}));

vi.mock("@/components/dashboard/PipelineFunnel", () => ({
  PipelineFunnel: ({ stages }: { stages: unknown[] }) => <div data-testid="pipeline-funnel" data-count={stages.length} />,
}));

vi.mock("@/components/dashboard/DeliverableStatusGrid", () => ({
  DeliverableStatusGrid: ({ total }: { total: number }) => <div data-testid="deliverable-grid" data-total={total} />,
}));

vi.mock("@/components/dashboard/TrendLineChart", () => ({
  TrendLineChart: () => <div data-testid="trend-chart" />,
}));

vi.mock("@/components/dashboard/MetricCardEnhanced", () => ({
  MetricCardEnhanced: ({ label, value }: { label: string; value: unknown }) => (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`} data-value={String(value)} />
  ),
}));

vi.mock("@/lib/format", () => ({
  formatCurrency: (n: number) => `$${n}`,
}));

const defaultAnalyticsReturn = {
  revenue: null,
  pipeline: null,
  deliverables: null,
  trends: null,
  isLoading: true,
  error: null,
  refetch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    status: "authenticated",
    session: { user: { id: "user-1" } },
  });
  mockUseAnalytics.mockReturnValue({ ...defaultAnalyticsReturn });
});

async function renderPage() {
  const { default: AnalyticsPage } = await import("@/app/(dashboard)/analytics/page");
  return render(<AnalyticsPage />);
}

describe("AnalyticsPage - auth guard", () => {
  it("renders analytics content when authenticated", async () => {
    await renderPage();

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

    await renderPage();

    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });

  it("shows spinner when unauthenticated (redirect handled by useAuth)", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      status: "unauthenticated",
      session: null,
    });

    await renderPage();

    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });
});

describe("AnalyticsPage - enabled parameter passed to useAnalytics", () => {
  it("passes enabled=true when authenticated and not loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      status: "authenticated",
      session: { user: { id: "user-1" } },
    });

    await renderPage();

    expect(mockUseAnalytics).toHaveBeenCalledWith("30d", true);
  });

  it("passes enabled=false when auth is loading", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      status: "loading",
      session: null,
    });

    await renderPage();

    expect(mockUseAnalytics).toHaveBeenCalledWith("30d", false);
  });

  it("passes enabled=false when not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      status: "unauthenticated",
      session: null,
    });

    await renderPage();

    expect(mockUseAnalytics).toHaveBeenCalledWith("30d", false);
  });
});

describe("AnalyticsPage - loading state", () => {
  it("renders loading skeletons when isLoading is true", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: true,
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Analytics")).toBeInTheDocument();
    });

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("AnalyticsPage - error state", () => {
  it("shows error message when analytics fetch fails", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: false,
      error: "Network error",
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load analytics: Network error/)).toBeInTheDocument();
    });
  });

  it("does not show analytics heading in error state", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: false,
      error: "Server error",
    });

    await renderPage();

    expect(screen.queryByText("Monthly Revenue")).not.toBeInTheDocument();
    expect(screen.queryByText("Deal Pipeline")).not.toBeInTheDocument();
  });
});

describe("AnalyticsPage - data rendering", () => {
  const loadedAnalytics = {
    revenue: {
      totalRevenue: 10000,
      totalPending: 2000,
      totalOverdue: 500,
      averagePayment: 2500,
      monthOverMonthChange: 15,
      monthlyBreakdown: [{ month: "2025-01", revenue: 5000, paymentCount: 2 }],
    },
    pipeline: {
      stages: [{ stage: "active", count: 3, value: 15000, percentage: 75 }],
      totalDeals: 4,
      totalPipelineValue: 20000,
      weightedPipelineValue: 12000,
    },
    deliverables: {
      statusCounts: { pending: 1, in_progress: 2, submitted: 0, verified: 5, missed: 1 },
      total: 9,
      completionRate: 55.6,
      onTimeRate: 80,
      overdueCount: 0,
      verifiedCount: 5,
      missedCount: 1,
    },
    trends: {
      revenueTrend: [{ period: "2025-01", value: 5000 }],
      dealTrend: [{ period: "2025-01", value: 3 }],
      completionTrend: [{ period: "2025-01", value: 5 }],
      revenueChange: 15,
      dealChange: 10,
      completionChange: 5,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };

  it("renders all metric cards with data", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("metric-total-revenue")).toBeInTheDocument();
    });

    expect(screen.getByTestId("metric-total-revenue").dataset.value).toBe("$10000");
    expect(screen.getByTestId("metric-pipeline-value").dataset.value).toBe("$20000");
    expect(screen.getByTestId("metric-completion-rate").dataset.value).toBe("55.6%");
    expect(screen.getByTestId("metric-overdue-items").dataset.value).toBe("0");
  });

  it("renders chart sections when loaded", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
    });

    expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Deliverable Status")).toBeInTheDocument();
    expect(screen.getByText("Revenue & Completion Trends")).toBeInTheDocument();
    expect(screen.getByText("Key Insights")).toBeInTheDocument();
  });

  it("passes revenue data to RevenueChart", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("revenue-chart")).toBeInTheDocument();
    });

    expect(screen.getByTestId("revenue-chart").dataset.count).toBe("1");
  });

  it("passes pipeline data to PipelineFunnel", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("pipeline-funnel")).toBeInTheDocument();
    });

    expect(screen.getByTestId("pipeline-funnel").dataset.count).toBe("1");
  });

  it("passes deliverable total to DeliverableStatusGrid", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("deliverable-grid")).toBeInTheDocument();
    });

    expect(screen.getByTestId("deliverable-grid").dataset.total).toBe("9");
  });

  it("renders key insights section", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Pending Revenue")).toBeInTheDocument();
    });

    expect(screen.getByText("Overdue Revenue")).toBeInTheDocument();
    expect(screen.getByText("Avg. Payment")).toBeInTheDocument();
  });

  it("renders key insight values from revenue data", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("$2000")).toBeInTheDocument();
    });

    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText("$2500")).toBeInTheDocument();
  });

  it("renders date range picker", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    });
  });

  it("does not render loading skeletons when loaded", async () => {
    mockUseAnalytics.mockReturnValue(loadedAnalytics);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
    });

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(0);
  });
});

describe("AnalyticsPage - fallback values", () => {
  it("renders $0 for revenue metrics when revenue is null", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: false,
      revenue: null,
      pipeline: { stages: [], totalDeals: 0, totalPipelineValue: 0, weightedPipelineValue: 0 },
      deliverables: { statusCounts: { pending: 0, in_progress: 0, submitted: 0, verified: 0, missed: 0 }, total: 0, completionRate: 0, onTimeRate: 0, overdueCount: 0, verifiedCount: 0, missedCount: 0 },
      trends: { revenueTrend: [], dealTrend: [], completionTrend: [], revenueChange: 0, dealChange: 0, completionChange: 0 },
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("metric-total-revenue")).toBeInTheDocument();
    });

    expect(screen.getByTestId("metric-total-revenue").dataset.value).toBe("$0");
  });

  it("renders 0% completion when deliverables is null", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: false,
      revenue: null,
      pipeline: { stages: [], totalDeals: 0, totalPipelineValue: 0, weightedPipelineValue: 0 },
      deliverables: null,
      trends: null,
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("metric-completion-rate")).toBeInTheDocument();
    });

    expect(screen.getByTestId("metric-completion-rate").dataset.value).toBe("0%");
  });

  it("renders 0 deals when pipeline is null", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: false,
      revenue: null,
      pipeline: null,
      deliverables: null,
      trends: null,
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("metric-pipeline-value")).toBeInTheDocument();
    });

    expect(screen.getByTestId("metric-pipeline-value").dataset.value).toBe("$0");
  });
});

describe("AnalyticsPage - overdue display", () => {
  it("shows needs attention when overdueCount > 0", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: false,
      revenue: null,
      pipeline: { stages: [], totalDeals: 0, totalPipelineValue: 0, weightedPipelineValue: 0 },
      deliverables: { statusCounts: { pending: 0, in_progress: 0, submitted: 0, verified: 0, missed: 0 }, total: 1, completionRate: 0, onTimeRate: 0, overdueCount: 3, verifiedCount: 0, missedCount: 0 },
      trends: null,
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("needs attention")).toBeInTheDocument();
    });
  });

  it("shows all on track when overdueCount is 0", async () => {
    mockUseAnalytics.mockReturnValue({
      ...defaultAnalyticsReturn,
      isLoading: false,
      revenue: null,
      pipeline: { stages: [], totalDeals: 0, totalPipelineValue: 0, weightedPipelineValue: 0 },
      deliverables: { statusCounts: { pending: 0, in_progress: 0, submitted: 0, verified: 0, missed: 0 }, total: 1, completionRate: 0, onTimeRate: 0, overdueCount: 0, verifiedCount: 0, missedCount: 0 },
      trends: null,
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("all on track")).toBeInTheDocument();
    });
  });
});
