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

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn(),
}));

import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { getDashboardData } from "@/lib/dashboard/data";

beforeEach(() => {
  vi.clearAllMocks();
  (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("getDashboardData - consolidation", () => {
  it("throws for empty userId", async () => {
    await expect(getDashboardData("")).rejects.toThrow("Invalid user ID");
  });

  it("throws for whitespace-only userId", async () => {
    await expect(getDashboardData("   ")).rejects.toThrow("Invalid user ID");
  });

  it("calls all queries with the same userId", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await getDashboardData("user-42");

    expect(getDealsByUserId).toHaveBeenCalledWith("user-42");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("user-42");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("user-42");
    expect(getSponsorsByUserId).toHaveBeenCalledWith("user-42");
  });

  it("returns enriched deals, deliverables, payments, and metrics", async () => {
    const sponsors = [{ id: "s1", name: "Acme Corp" }];
    const deals = [
      { id: "d1", sponsorId: "s1", title: "Deal 1", status: "active", totalValue: 1000, currency: "USD", endDate: null },
      { id: "d2", sponsorId: "s1", title: "Deal 2", status: "draft", totalValue: null, currency: "USD", endDate: null },
    ];
    const deliverables = [
      { id: "dl1", dealId: "d1", title: "Deliverable 1", status: "pending", dueDate: null },
    ];
    const payments = [
      { id: "p1", dealId: "d1", status: "paid", amount: 5000, paidDate: "2025-01-15", dueDate: null, currency: "USD", createdAt: new Date("2025-01-15") },
    ];

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(sponsors);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(deals);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(deliverables);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(payments);

    const result = await getDashboardData("user-1");

    expect(result.deals[0]).toEqual({
      id: "d1",
      sponsorName: "Acme Corp",
      title: "Deal 1",
      status: "active",
      totalValue: 1000,
      currency: "USD",
      endDate: null,
    });
    expect(result.deliverables[0]).toEqual({
      id: "dl1",
      title: "Deliverable 1",
      dueDate: null,
      status: "pending",
      dealTitle: "Deal 1",
      sponsorName: "Acme Corp",
    });
    expect(result.payments[0]).toEqual(
      expect.objectContaining({
        id: "p1",
        amount: 5000,
        status: "paid",
        dealTitle: "Deal 1",
        sponsorName: "Acme Corp",
      })
    );
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
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", sponsorId: "s1", title: "D1", status: "active", totalValue: null, currency: "USD", endDate: null },
      { id: "d2", sponsorId: "s1", title: "D2", status: "active", totalValue: null, currency: "USD", endDate: null },
      { id: "d3", sponsorId: "s1", title: "D3", status: "completed", totalValue: null, currency: "USD", endDate: null },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", dealId: "d1", title: "DL1", status: "pending", dueDate: null },
      { id: "dl2", dealId: "d1", title: "DL2", status: "in_progress", dueDate: null },
      { id: "dl3", dealId: "d1", title: "DL3", status: "verified", dueDate: null },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", dealId: "d1", status: "paid", amount: 3000, paidDate: "2025-06-01", dueDate: null, currency: "USD", createdAt: new Date() },
      { id: "p2", dealId: "d1", status: "overdue", amount: 1000, dueDate: null, paidDate: null, currency: "USD", createdAt: new Date() },
      { id: "p3", dealId: "d1", status: "pending", amount: 2000, dueDate: "2020-01-01", paidDate: null, currency: "USD", createdAt: new Date() },
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

  it("uses Unknown for missing sponsors", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", sponsorId: "missing", title: "Deal", status: "active", totalValue: null, currency: "USD", endDate: null },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDashboardData("user-1");

    expect(result.deals[0].sponsorName).toBe("Unknown");
  });

  it("enriches deliverables with deal and sponsor info", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s1", name: "Sponsor A" },
    ]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", sponsorId: "s1", title: "My Deal", status: "active", totalValue: null, currency: "USD", endDate: null },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", dealId: "d1", title: "Deliverable", status: "pending", dueDate: null },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDashboardData("user-1");

    expect(result.deliverables[0].dealTitle).toBe("My Deal");
    expect(result.deliverables[0].sponsorName).toBe("Sponsor A");
  });

  it("enriches payments with deal and sponsor info", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s1", name: "Big Sponsor" },
    ]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", sponsorId: "s1", title: "Payment Deal", status: "active", totalValue: null, currency: "USD", endDate: null },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", dealId: "d1", status: "paid", amount: 1000, paidDate: "2025-01-01", dueDate: null, currency: "USD", createdAt: new Date("2025-01-01") },
    ]);

    const result = await getDashboardData("user-1");

    expect(result.payments[0].dealTitle).toBe("Payment Deal");
    expect(result.payments[0].sponsorName).toBe("Big Sponsor");
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
