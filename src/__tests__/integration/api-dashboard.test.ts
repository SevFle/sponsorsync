import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/dashboard/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentsByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/dashboard - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 when session has null user", async () => {
    mockAuth({ user: null } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET();
    expect(getDealsByUserId).not.toHaveBeenCalled();
    expect(getDeliverablesByUserId).not.toHaveBeenCalled();
    expect(getPaymentsByUserId).not.toHaveBeenCalled();
  });
});

describe("GET /api/dashboard - Promise.all parallel queries", () => {
  it("queries deals, deliverables, and payments in parallel", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active" },
      { id: "d2", status: "draft" },
      { id: "d3", status: "completed" },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "del1", status: "pending" },
      { id: "del2", status: "in_progress" },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "paid", amount: 5000, paidDate: "2025-01-15" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getDealsByUserId).toHaveBeenCalledWith("user-1");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("user-1");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("user-1");
    expect(body.deals).toHaveLength(3);
    expect(body.deliverables).toHaveLength(2);
    expect(body.payments).toHaveLength(1);
  });

  it("passes correct userId to all queries", async () => {
    const customSession = { user: { id: "custom-user-42", email: "custom@test.com", name: "Custom User" } };
    mockAuth(customSession);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await GET();

    expect(getDealsByUserId).toHaveBeenCalledWith("custom-user-42");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("custom-user-42");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("custom-user-42");
  });
});

describe("GET /api/dashboard - metrics computation", () => {
  it("computes correct metrics for active, draft, completed deals", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active" },
      { id: "d2", status: "active" },
      { id: "d3", status: "draft" },
      { id: "d4", status: "completed" },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.activeDeals).toBe(2);
    expect(body.metrics.draftDeals).toBe(1);
    expect(body.metrics.completedDeals).toBe(1);
  });

  it("computes revenueMtd from paid payments with paidDate", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "paid", amount: 5000, paidDate: "2025-01-15" },
      { id: "p2", status: "paid", amount: 3000, paidDate: "2025-01-20" },
      { id: "p3", status: "pending", amount: 2000, paidDate: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.revenueMtd).toBe(8000);
  });

  it("excludes unpaid payments from revenueMtd", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "paid", amount: 5000, paidDate: "2025-01-15" },
      { id: "p2", status: "paid", amount: 3000, paidDate: null },
      { id: "p3", status: "pending", amount: 2000, paidDate: "2025-01-15" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.revenueMtd).toBe(5000);
  });

  it("counts pending and in_progress deliverables", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "del1", status: "pending" },
      { id: "del2", status: "in_progress" },
      { id: "del3", status: "verified" },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.pendingDeliverables).toBe(2);
  });

  it("does not count verified or missed deliverables as pending", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "del1", status: "verified" },
      { id: "del2", status: "missed" },
      { id: "del3", status: "cancelled" },
    ]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.pendingDeliverables).toBe(0);
  });

  it("counts overdue payments including pending with past dueDate", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "overdue", amount: 1000, dueDate: null },
      { id: "p2", status: "pending", amount: 2000, dueDate: "2020-01-01" },
      { id: "p3", status: "pending", amount: 3000, dueDate: "2099-12-31" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.overduePayments).toBe(2);
  });

  it("does not count future pending payments as overdue", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "pending", amount: 1000, dueDate: "2099-12-31" },
      { id: "p2", status: "pending", amount: 2000, dueDate: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.overduePayments).toBe(0);
  });

  it("returns empty data when user has nothing", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deals).toEqual([]);
    expect(body.deliverables).toEqual([]);
    expect(body.payments).toEqual([]);
    expect(body.metrics).toEqual({
      activeDeals: 0,
      draftDeals: 0,
      completedDeals: 0,
      revenueMtd: 0,
      pendingDeliverables: 0,
      overduePayments: 0,
    });
  });
});

describe("GET /api/dashboard - edge cases", () => {
  it("handles only overdue status payments", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "overdue", amount: 1000, dueDate: "2020-01-01" },
      { id: "p2", status: "overdue", amount: 2000, dueDate: null },
      { id: "p3", status: "overdue", amount: 3000, dueDate: "2020-06-01" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.overduePayments).toBe(3);
  });

  it("handles deals with unknown status (not counted in any metric)", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "cancelled" },
      { id: "d2", status: "unknown_status" },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.activeDeals).toBe(0);
    expect(body.metrics.draftDeals).toBe(0);
    expect(body.metrics.completedDeals).toBe(0);
  });

  it("handles revenueMtd with zero amounts", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "paid", amount: 0, paidDate: "2025-01-15" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.revenueMtd).toBe(0);
  });

  it("handles very large revenue amounts", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "paid", amount: 999999999, paidDate: "2025-01-15" },
      { id: "p2", status: "paid", amount: 999999999, paidDate: "2025-01-20" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.revenueMtd).toBe(1999999998);
  });

  it("returns all raw data alongside metrics", async () => {
    const rawDeals = [
      { id: "d1", status: "active", sponsorName: "Test" },
    ];
    const rawDeliverables = [
      { id: "del1", status: "pending", title: "Test Deliverable" },
    ];
    const rawPayments = [
      { id: "p1", status: "paid", amount: 1000, paidDate: "2025-01-15" },
    ];

    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(rawDeals);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(rawDeliverables);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(rawPayments);

    const response = await GET();
    const body = await response.json();

    expect(body.deals).toEqual(rawDeals);
    expect(body.deliverables).toEqual(rawDeliverables);
    expect(body.payments).toEqual(rawPayments);
  });

  it("handles paid payment without paidDate (not counted in revenue)", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", status: "paid", amount: 5000, paidDate: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.metrics.revenueMtd).toBe(0);
  });
});

describe("GET /api/dashboard - error propagation", () => {
  it("propagates database errors from deals query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(GET()).rejects.toThrow("Database connection failed");
  });

  it("propagates database errors from deliverables query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Query timeout")
    );
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(GET()).rejects.toThrow("Query timeout");
  });

  it("propagates database errors from payments query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Connection refused")
    );

    await expect(GET()).rejects.toThrow("Connection refused");
  });
});

describe("GET /api/dashboard - session validation edge cases", () => {
  it("returns 401 when session user id is empty string", async () => {
    mockAuth({ user: { id: "", email: "test@test.com" } } as any);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("passes auth check with whitespace id (truthy) and queries database", async () => {
    mockAuth({ user: { id: "  ", email: "test@test.com" } } as any);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(getDealsByUserId).toHaveBeenCalledWith("  ");
  });

  it("returns 401 when session user is undefined", async () => {
    mockAuth({ user: undefined } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 when session is empty object", async () => {
    mockAuth({} as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("does not query database when session user id is falsy", async () => {
    mockAuth({ user: { id: 0 } } as any);
    await GET();
    expect(getDealsByUserId).not.toHaveBeenCalled();
    expect(getDeliverablesByUserId).not.toHaveBeenCalled();
    expect(getPaymentsByUserId).not.toHaveBeenCalled();
  });

  it("accepts session with valid id and queries database", async () => {
    mockAuth({ user: { id: "valid-id", email: "test@test.com", name: "Test" } });
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(getDealsByUserId).toHaveBeenCalledWith("valid-id");
  });

  it("returns JSON content type for 401 response", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns JSON content type for 200 response", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("GET /api/dashboard - response structure", () => {
  it("always includes all metric fields even with zero data", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty("deals");
    expect(body).toHaveProperty("deliverables");
    expect(body).toHaveProperty("payments");
    expect(body).toHaveProperty("metrics");
    expect(body.metrics).toHaveProperty("activeDeals");
    expect(body.metrics).toHaveProperty("draftDeals");
    expect(body.metrics).toHaveProperty("completedDeals");
    expect(body.metrics).toHaveProperty("revenueMtd");
    expect(body.metrics).toHaveProperty("pendingDeliverables");
    expect(body.metrics).toHaveProperty("overduePayments");
  });

  it("returns raw deal objects with all their properties", async () => {
    const rawDeal = {
      id: "d1",
      status: "active",
      sponsorName: "Test Sponsor",
      title: "Test Deal",
      totalValue: 5000,
      currency: "USD",
      endDate: "2025-12-31",
    };
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([rawDeal]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.deals[0]).toEqual(rawDeal);
  });

  it("returns raw deliverable objects with all their properties", async () => {
    const rawDeliverable = {
      id: "dl1",
      title: "Test Deliverable",
      dueDate: "2025-06-30",
      status: "pending",
      dealId: "d1",
    };
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([rawDeliverable]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.deliverables[0]).toEqual(rawDeliverable);
  });

  it("returns raw payment objects with all their properties", async () => {
    const rawPayment = {
      id: "p1",
      amount: 2500,
      currency: "USD",
      status: "paid",
      dueDate: "2025-05-01",
      paidDate: "2025-04-28",
    };
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([rawPayment]);

    const response = await GET();
    const body = await response.json();

    expect(body.payments[0]).toEqual(rawPayment);
  });
});
