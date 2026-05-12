import { describe, it, expect } from "vitest";
import { computeDashboardMetrics } from "@/lib/dashboard/metrics";

describe("computeDashboardMetrics", () => {
  it("returns zero metrics for empty data", () => {
    const result = computeDashboardMetrics([], [], []);
    expect(result).toEqual({
      activeDeals: 0,
      draftDeals: 0,
      completedDeals: 0,
      revenueMtd: 0,
      pendingDeliverables: 0,
      overduePayments: 0,
    });
  });

  it("counts active, draft, and completed deals", () => {
    const deals = [
      { status: "active" },
      { status: "active" },
      { status: "draft" },
      { status: "completed" },
      { status: "cancelled" },
    ];

    const result = computeDashboardMetrics(deals, [], []);

    expect(result.activeDeals).toBe(2);
    expect(result.draftDeals).toBe(1);
    expect(result.completedDeals).toBe(1);
  });

  it("computes revenueMtd from paid payments with paidDate", () => {
    const payments = [
      { status: "paid", amount: 5000, paidDate: "2025-01-15", dueDate: null },
      { status: "paid", amount: 3000, paidDate: "2025-01-20", dueDate: null },
      { status: "pending", amount: 2000, paidDate: null, dueDate: null },
      { status: "paid", amount: 1000, paidDate: null, dueDate: null },
    ];

    const result = computeDashboardMetrics([], [], payments);

    expect(result.revenueMtd).toBe(8000);
  });

  it("counts pending and in_progress deliverables only", () => {
    const deliverables = [
      { status: "pending" },
      { status: "in_progress" },
      { status: "verified" },
      { status: "missed" },
      { status: "submitted" },
    ];

    const result = computeDashboardMetrics([], deliverables, []);

    expect(result.pendingDeliverables).toBe(2);
  });

  it("counts overdue and pending-with-past-dueDate payments as overdue", () => {
    const payments = [
      { status: "overdue", amount: 100, dueDate: null, paidDate: null },
      { status: "pending", amount: 200, dueDate: "2020-01-01", paidDate: null },
      { status: "pending", amount: 300, dueDate: "2099-12-31", paidDate: null },
      { status: "pending", amount: 400, dueDate: null, paidDate: null },
    ];

    const result = computeDashboardMetrics([], [], payments);

    expect(result.overduePayments).toBe(2);
  });

  it("ignores unknown deal statuses", () => {
    const deals = [{ status: "unknown" }];

    const result = computeDashboardMetrics(deals, [], []);

    expect(result.activeDeals).toBe(0);
    expect(result.draftDeals).toBe(0);
    expect(result.completedDeals).toBe(0);
  });

  it("handles large revenue amounts without overflow", () => {
    const payments = [
      { status: "paid", amount: 999999999, paidDate: "2025-01-15", dueDate: null },
      { status: "paid", amount: 999999999, paidDate: "2025-01-20", dueDate: null },
    ];

    const result = computeDashboardMetrics([], [], payments);

    expect(result.revenueMtd).toBe(1999999998);
  });

  it("computes combined metrics with all data types", () => {
    const deals = [
      { status: "active" },
      { status: "draft" },
    ];
    const deliverables = [
      { status: "pending" },
      { status: "in_progress" },
    ];
    const payments = [
      { status: "paid", amount: 5000, paidDate: "2025-01-15", dueDate: "2025-01-01" },
    ];

    const result = computeDashboardMetrics(deals, deliverables, payments);

    expect(result.activeDeals).toBe(1);
    expect(result.draftDeals).toBe(1);
    expect(result.completedDeals).toBe(0);
    expect(result.revenueMtd).toBe(5000);
    expect(result.pendingDeliverables).toBe(2);
    expect(result.overduePayments).toBe(0);
  });
});
