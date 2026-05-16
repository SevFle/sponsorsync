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

    await expect(getDashboardData("user-1")).rejects.toThrow("Failed to load deals: DB error");
  });

  it("gracefully degrades when deliverables query fails", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Query failed"));
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDashboardData("user-1");

    expect(result.deliverables).toEqual([]);
    expect(result.deals).toEqual([]);
    expect(result.payments).toEqual([]);
    expect(result.metrics.activeDeals).toBe(0);
  });

  it("gracefully degrades when payments query fails", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Connection refused"));

    const result = await getDashboardData("user-1");

    expect(result.payments).toEqual([]);
    expect(result.deals).toEqual([]);
    expect(result.deliverables).toEqual([]);
    expect(result.metrics.overduePayments).toBe(0);
  });

  it("throws for null userId", async () => {
    await expect(getDashboardData(null as any)).rejects.toThrow("Invalid user ID");
  });

  it("throws for undefined userId", async () => {
    await expect(getDashboardData(undefined as any)).rejects.toThrow("Invalid user ID");
  });

  it("handles payments with no matching deal", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", dealId: "nonexistent", status: "paid", amount: 1000, paidDate: "2025-01-15", dueDate: null, currency: "USD", createdAt: "2025-01-15" },
    ]);

    const result = await getDashboardData("user-1");

    expect(result.payments[0].dealTitle).toBeUndefined();
    expect(result.payments[0].sponsorName).toBeUndefined();
  });

  it("handles deliverables with no matching deal", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", dealId: "nonexistent", title: "Orphan", status: "pending", dueDate: null },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDashboardData("user-1");

    expect(result.deliverables[0].dealTitle).toBeUndefined();
    expect(result.deliverables[0].sponsorName).toBeUndefined();
  });

  it("defaults currency to USD when null", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", sponsorId: "s1", title: "No Currency", status: "active", totalValue: 500, currency: null, endDate: null },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", dealId: "d1", status: "paid", amount: 500, paidDate: "2025-01-01", dueDate: null, currency: null, createdAt: "2025-01-01" },
    ]);

    const result = await getDashboardData("user-1");

    expect(result.deals[0].currency).toBe("USD");
    expect(result.payments[0].currency).toBe("USD");
  });

  it("converts Date objects in payment createdAt to ISO string", async () => {
    const date = new Date("2025-06-15T10:30:00.000Z");
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", dealId: "d1", status: "paid", amount: 1000, paidDate: "2025-06-15", dueDate: null, currency: "USD", createdAt: date },
    ]);

    const result = await getDashboardData("user-1");

    expect(result.payments[0].createdAt).toBe(date.toISOString());
  });

  it("handles string createdAt in payments", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", dealId: "d1", status: "paid", amount: 1000, paidDate: "2025-01-01", dueDate: null, currency: "USD", createdAt: "2025-01-01T00:00:00Z" },
    ]);

    const result = await getDashboardData("user-1");

    expect(result.payments[0].createdAt).toBe("2025-01-01T00:00:00Z");
  });

  it("handles null createdAt in payments", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", dealId: "d1", status: "paid", amount: 1000, paidDate: "2025-01-01", dueDate: null, currency: "USD", createdAt: null },
    ]);

    const result = await getDashboardData("user-1");

    expect(result.payments[0].createdAt).toBe("");
  });

  it("does not query database when userId is invalid", async () => {
    await expect(getDashboardData("")).rejects.toThrow("Invalid user ID");
    expect(getDealsByUserId).not.toHaveBeenCalled();
    expect(getDeliverablesByUserId).not.toHaveBeenCalled();
    expect(getPaymentsByUserId).not.toHaveBeenCalled();
    expect(getSponsorsByUserId).not.toHaveBeenCalled();
  });

  it("propagates errors from sponsors query", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Sponsor query failed"));
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(getDashboardData("user-1")).rejects.toThrow("Failed to load sponsors: Sponsor query failed");
  });

  it("returns deal with null totalValue and endDate", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "s1", name: "Sponsor" }]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", sponsorId: "s1", title: "Deal", status: "draft", totalValue: null, currency: "EUR", endDate: null },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDashboardData("user-1");

    expect(result.deals[0]).toEqual({
      id: "d1",
      sponsorName: "Sponsor",
      title: "Deal",
      status: "draft",
      totalValue: null,
      currency: "EUR",
      endDate: null,
    });
  });

  it("enriches multiple deliverables linked to the same deal", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "s1", name: "Sponsor" }]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", sponsorId: "s1", title: "Shared Deal", status: "active", totalValue: 1000, currency: "USD", endDate: null },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", dealId: "d1", title: "Del 1", status: "pending", dueDate: "2025-07-01" },
      { id: "dl2", dealId: "d1", title: "Del 2", status: "in_progress", dueDate: "2025-08-01" },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDashboardData("user-1");

    expect(result.deliverables).toHaveLength(2);
    expect(result.deliverables[0].dealTitle).toBe("Shared Deal");
    expect(result.deliverables[0].sponsorName).toBe("Sponsor");
    expect(result.deliverables[1].dealTitle).toBe("Shared Deal");
    expect(result.deliverables[1].sponsorName).toBe("Sponsor");
  });
});
