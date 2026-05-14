import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentsByUserId: vi.fn(),
}));

import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getDashboardData } from "@/lib/dashboard/data";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDashboardData - consolidation", () => {
  it("calls all three queries with the same userId", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await getDashboardData("user-42");

    expect(getDealsByUserId).toHaveBeenCalledWith("user-42");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("user-42");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("user-42");
  });

  it("returns deals, deliverables, payments, and metrics", async () => {
    const deals = [
      { id: "d1", status: "active" },
      { id: "d2", status: "draft" },
    ];
    const deliverables = [
      { id: "dl1", status: "pending" },
    ];
    const payments = [
      { id: "p1", status: "paid", amount: 5000, paidDate: "2025-01-15" },
    ];

    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(deals);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(deliverables);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(payments);

    const result = await getDashboardData("user-1");

    expect(result.deals).toEqual(deals);
    expect(result.deliverables).toEqual(deliverables);
    expect(result.payments).toEqual(payments);
    expect(result.metrics).toEqual({
      activeDeals: 1,
      draftDeals: 1,
      completedDeals: 0,
      revenueMtd: 5000,
      pendingDeliverables: 1,
      overduePayments: 0,
    });
  });

  it("computes correct metrics from combined data", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active" },
      { id: "d2", status: "active" },
      { id: "d3", status: "completed" },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", status: "pending" },
      { id: "dl2", status: "in_progress" },
      { id: "dl3", status: "verified" },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "paid", amount: 3000, paidDate: "2025-06-01" },
      { id: "p2", status: "overdue", amount: 1000, dueDate: null },
      { id: "p3", status: "pending", amount: 2000, dueDate: "2020-01-01" },
    ]);

    const result = await getDashboardData("user-1");

    expect(result.metrics.activeDeals).toBe(2);
    expect(result.metrics.completedDeals).toBe(1);
    expect(result.metrics.revenueMtd).toBe(3000);
    expect(result.metrics.pendingDeliverables).toBe(2);
    expect(result.metrics.overduePayments).toBe(2);
  });

  it("returns zero metrics when user has no data", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDashboardData("user-1");

    expect(result.metrics).toEqual({
      activeDeals: 0,
      draftDeals: 0,
      completedDeals: 0,
      revenueMtd: 0,
      pendingDeliverables: 0,
      overduePayments: 0,
    });
  });

  it("propagates errors from deals query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(getDashboardData("user-1")).rejects.toThrow("DB error");
  });

  it("propagates errors from deliverables query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Query failed"));
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(getDashboardData("user-1")).rejects.toThrow("Query failed");
  });

  it("propagates errors from payments query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Connection refused"));

    await expect(getDashboardData("user-1")).rejects.toThrow("Connection refused");
  });
});
