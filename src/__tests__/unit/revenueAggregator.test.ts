import { describe, it, expect } from "vitest";
import { aggregateRevenueByMonth, computeRevenueSummary } from "@/lib/analytics/revenueAggregator";
import type { PaymentLike } from "@/lib/analytics/revenueAggregator";

describe("aggregateRevenueByMonth", () => {
  it("returns empty array for no payments", () => {
    expect(aggregateRevenueByMonth([])).toEqual([]);
  });

  it("groups paid payments by month", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 3000, status: "paid", paidDate: "2025-01-20", dueDate: null },
      { amount: 7000, status: "paid", paidDate: "2025-02-10", dueDate: null },
    ];

    const result = aggregateRevenueByMonth(payments);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ month: "2025-01", revenue: 8000, paymentCount: 2 });
    expect(result[1]).toEqual({ month: "2025-02", revenue: 7000, paymentCount: 1 });
  });

  it("excludes non-paid payments", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 3000, status: "pending", paidDate: null, dueDate: null },
      { amount: 2000, status: "overdue", paidDate: null, dueDate: "2025-01-01" },
    ];

    const result = aggregateRevenueByMonth(payments);

    expect(result).toHaveLength(1);
    expect(result[0].revenue).toBe(5000);
  });

  it("excludes paid payments without paidDate", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: null, dueDate: null },
    ];

    expect(aggregateRevenueByMonth(payments)).toEqual([]);
  });

  it("filters by date range", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 7000, status: "paid", paidDate: "2025-03-15", dueDate: null },
    ];

    const range = { from: new Date("2025-03-01"), to: new Date("2025-03-31") };
    const result = aggregateRevenueByMonth(payments, range);

    expect(result).toHaveLength(1);
    expect(result[0].revenue).toBe(7000);
  });

  it("sorts results by month ascending", () => {
    const payments: PaymentLike[] = [
      { amount: 3000, status: "paid", paidDate: "2025-03-15", dueDate: null },
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 7000, status: "paid", paidDate: "2025-02-15", dueDate: null },
    ];

    const result = aggregateRevenueByMonth(payments);

    expect(result[0].month).toBe("2025-01");
    expect(result[1].month).toBe("2025-02");
    expect(result[2].month).toBe("2025-03");
  });
});

describe("computeRevenueSummary", () => {
  it("returns zero values for empty payments", () => {
    const result = computeRevenueSummary([]);

    expect(result.totalRevenue).toBe(0);
    expect(result.totalPending).toBe(0);
    expect(result.totalOverdue).toBe(0);
    expect(result.averagePayment).toBe(0);
    expect(result.monthOverMonthChange).toBe(0);
    expect(result.monthlyBreakdown).toEqual([]);
  });

  it("computes totalRevenue from paid payments", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 3000, status: "paid", paidDate: "2025-01-20", dueDate: null },
    ];

    expect(computeRevenueSummary(payments).totalRevenue).toBe(8000);
  });

  it("computes totalPending from pending payments", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "pending", paidDate: null, dueDate: null },
      { amount: 3000, status: "pending", paidDate: null, dueDate: null },
    ];

    expect(computeRevenueSummary(payments).totalPending).toBe(8000);
  });

  it("computes totalOverdue from overdue and past-due pending payments", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "overdue", paidDate: null, dueDate: null },
      { amount: 3000, status: "pending", paidDate: null, dueDate: "2020-01-01" },
    ];

    expect(computeRevenueSummary(payments).totalOverdue).toBe(8000);
  });

  it("computes averagePayment", () => {
    const payments: PaymentLike[] = [
      { amount: 6000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 4000, status: "paid", paidDate: "2025-01-20", dueDate: null },
    ];

    expect(computeRevenueSummary(payments).averagePayment).toBe(5000);
  });

  it("computes monthOverMonthChange", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
      { amount: 10000, status: "paid", paidDate: "2025-02-15", dueDate: null },
    ];

    expect(computeRevenueSummary(payments).monthOverMonthChange).toBe(100);
  });

  it("returns 0 monthOverMonthChange when previous month is 0", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
    ];

    expect(computeRevenueSummary(payments).monthOverMonthChange).toBe(0);
  });

  it("handles single record correctly", () => {
    const payments: PaymentLike[] = [
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null },
    ];

    const result = computeRevenueSummary(payments);

    expect(result.totalRevenue).toBe(5000);
    expect(result.averagePayment).toBe(5000);
    expect(result.monthlyBreakdown).toHaveLength(1);
  });
});
