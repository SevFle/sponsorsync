import { describe, it, expect } from "vitest";
import {
  analyzeRevenueTrend,
  analyzeCompletionTrend,
  computeTrendSummary,
} from "@/lib/analytics/trendAnalyzer";
import type { PaymentLike } from "@/lib/analytics/revenueAggregator";
import type { DeliverableLike } from "@/lib/analytics/deliverableMetrics";
import type { DealLike } from "@/lib/analytics/pipelineCalculator";

describe("analyzeRevenueTrend", () => {
  it("returns empty array for no payments", () => {
    expect(analyzeRevenueTrend([])).toEqual([]);
  });

  it("groups revenue by month", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 3000, status: "paid", paidDate: "2025-01-20", dueDate: null },
      { amount: 7000, status: "paid", paidDate: "2025-02-10", dueDate: null },
    ];

    const trend = analyzeRevenueTrend(payments);

    expect(trend).toHaveLength(2);
    expect(trend[0]).toEqual({ period: "2025-01", value: 8000 });
    expect(trend[1]).toEqual({ period: "2025-02", value: 7000 });
  });

  it("excludes non-paid payments", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 3000, status: "pending", paidDate: null, dueDate: null },
    ];

    const trend = analyzeRevenueTrend(payments);
    expect(trend).toHaveLength(1);
    expect(trend[0].value).toBe(5000);
  });
});

describe("analyzeCompletionTrend", () => {
  it("returns empty array for no verified deliverables", () => {
    const deliverables: DeliverableLike[] = [
      { status: "pending", dueDate: null, completedDate: null },
    ];

    expect(analyzeCompletionTrend(deliverables)).toEqual([]);
  });

  it("groups completions by month", () => {
    const deliverables: DeliverableLike[] = [
      { status: "verified", dueDate: null, completedDate: "2025-01-15" },
      { status: "verified", dueDate: null, completedDate: "2025-01-20" },
      { status: "verified", dueDate: null, completedDate: "2025-02-10" },
    ];

    const trend = analyzeCompletionTrend(deliverables);

    expect(trend).toHaveLength(2);
    expect(trend[0]).toEqual({ period: "2025-01", value: 2 });
    expect(trend[1]).toEqual({ period: "2025-02", value: 1 });
  });
});

describe("computeTrendSummary", () => {
  it("returns empty trends and zero changes for no data", () => {
    const summary = computeTrendSummary([], [], [], []);

    expect(summary.revenueTrend).toEqual([]);
    expect(summary.dealTrend).toEqual([]);
    expect(summary.completionTrend).toEqual([]);
    expect(summary.revenueChange).toBe(0);
    expect(summary.dealChange).toBe(0);
    expect(summary.completionChange).toBe(0);
  });

  it("computes revenue change percentage", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 10000, status: "paid", paidDate: "2025-02-15", dueDate: null },
    ];

    const summary = computeTrendSummary(payments, [], [], []);

    expect(summary.revenueChange).toBe(100);
  });

  it("computes completion change", () => {
    const deliverables: DeliverableLike[] = [
      { status: "verified", dueDate: null, completedDate: "2025-01-15" },
      { status: "verified", dueDate: null, completedDate: "2025-02-15" },
      { status: "verified", dueDate: null, completedDate: "2025-02-20" },
    ];

    const summary = computeTrendSummary([], [], [], deliverables);

    expect(summary.completionChange).toBe(100);
  });

  it("computes deal trend", () => {
    const deals: DealLike[] = [
      { status: "active", totalValue: 5000 },
      { status: "active", totalValue: 3000 },
    ];
    const createdDates = ["2025-01-15T00:00:00Z", "2025-02-15T00:00:00Z"];

    const summary = computeTrendSummary([], deals, createdDates, []);

    expect(summary.dealTrend).toHaveLength(2);
    expect(summary.dealTrend[0].value).toBe(1);
    expect(summary.dealTrend[1].value).toBe(1);
  });
});
