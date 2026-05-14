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

beforeEach(() => {
  vi.clearAllMocks();
  mockApiFetch.mockImplementation((url: string) => {
    if (url.includes("/revenue")) return Promise.resolve(mockRevenue);
    if (url.includes("/pipeline")) return Promise.resolve(mockPipeline);
    if (url.includes("/deliverables")) return Promise.resolve(mockDeliverables);
    if (url.includes("/trends")) return Promise.resolve(mockTrends);
    return Promise.resolve({});
  });
});

describe("useAnalytics - uses apiFetch with credentials", () => {
  it("calls apiFetch for all four analytics endpoints", async () => {
    renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(4);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/revenue?range=30d")
    );
    expect(mockApiFetch).toHaveBeenCalledWith("/api/analytics/pipeline");
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/deliverables?range=30d")
    );
    expect(mockApiFetch).toHaveBeenCalledWith("/api/analytics/trends");
  });

  it("uses apiFetch which includes credentials: include", async () => {
    renderHook(() => useAnalytics("30d"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });

    for (const call of mockApiFetch.mock.calls) {
      expect(typeof call[0]).toBe("string");
      expect(call[0]).toMatch(/^\/api\/analytics\//);
    }
  });

  it("passes range parameter to revenue and deliverables endpoints", async () => {
    renderHook(() => useAnalytics("7d"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(4);
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

  it("starts with isLoading true", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAnalytics("30d"));
    expect(result.current.isLoading).toBe(true);
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
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/revenue")) return Promise.resolve(mockRevenue);
      if (url.includes("/pipeline")) return Promise.resolve(mockPipeline);
      if (url.includes("/deliverables")) return Promise.resolve(mockDeliverables);
      if (url.includes("/trends")) return Promise.resolve(mockTrends);
      return Promise.resolve({});
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(4);
  });
});
