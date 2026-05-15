import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useAnalytics } from "@/hooks/useAnalytics";

const mockRevenue = { totalRevenue: 1000, monthOverMonthChange: 10, totalPending: 200, totalOverdue: 50, averagePayment: 150, monthlyBreakdown: [] };
const mockPipeline = { totalPipelineValue: 5000, totalDeals: 3, stages: [] };
const mockDeliverables = { completionRate: 80, verifiedCount: 4, overdueCount: 1, total: 5, statusCounts: { pending: 1, in_progress: 1, submitted: 1, verified: 4, missed: 1 } };
const mockTrends = { revenueTrend: [], completionTrend: [] };

const mockAggregatedResponse = {
  revenue: mockRevenue,
  pipeline: mockPipeline,
  deliverables: mockDeliverables,
  trends: mockTrends,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApiFetch.mockResolvedValue(mockAggregatedResponse);
});

describe("useAnalytics - uses apiFetch with credentials", () => {
  it("calls apiFetch for the aggregated analytics endpoint", async () => {
    renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics?range=30d")
    );
  });

  it("uses apiFetch which includes credentials: include", async () => {
    renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/analytics\?range=/)
    );
  });

  it("passes range parameter to the aggregated endpoint", async () => {
    renderHook(() => useAnalytics("7d"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("range=7d")
    );
  });
});

describe("useAnalytics - response handling", () => {
  it("sets analytics data from successful responses", async () => {
    const { result } = renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.revenue).toEqual(mockRevenue);
    expect(result.current.pipeline).toEqual(mockPipeline);
    expect(result.current.deliverables).toEqual(mockDeliverables);
    expect(result.current.trends).toEqual(mockTrends);
    expect(result.current.error).toBeNull();
  });

  it("sets error when apiFetch throws", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.revenue).toBeNull();
  });

  it("sets unknown error message for non-Error throws", async () => {
    mockApiFetch.mockRejectedValue("string error");

    const { result } = renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Unknown error");
  });

  it("starts with isLoading true when enabled", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAnalytics("30d"));
    expect(result.current.isLoading).toBe(true);
  });

  it("starts with isLoading false when disabled", () => {
    const { result } = renderHook(() => useAnalytics("30d", false));
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAnalytics - refetch", () => {
  it("provides refetch function", async () => {
    const { result } = renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });

  it("refetch calls apiFetch again", async () => {
    const { result } = renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(mockAggregatedResponse);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});

describe("useAnalytics - auth gating via enabled parameter", () => {
  it("does not fetch when enabled is false", () => {
    renderHook(() => useAnalytics("30d", false));

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("fetches when enabled is true", async () => {
    renderHook(() => useAnalytics("30d", true));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("does not make API calls when auth is not confirmed", () => {
    renderHook(() => useAnalytics("30d", false));

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("starts fetching when enabled changes from false to true", async () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useAnalytics("30d", enabled),
      { initialProps: { enabled: false } }
    );

    expect(mockApiFetch).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("does not fetch while auth is loading", () => {
    renderHook(() => useAnalytics("30d", false));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/revenue")
    );
  });

  it("preserves data when enabled changes to false after fetch", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useAnalytics("30d", enabled),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.revenue).toEqual(mockRevenue);

    rerender({ enabled: false });

    expect(result.current.revenue).toEqual(mockRevenue);
  });
});
