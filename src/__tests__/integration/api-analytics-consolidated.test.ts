import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/analytics/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

function makeRequest(url: string) {
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/analytics - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(401);
  });

  it("returns 401 when session user id is empty string", async () => {
    mockAuth({ user: { id: "" } } as any);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(401);
  });

  it("returns JSON content type for 401", async () => {
    mockAuth(null);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(getDealsByUserId).not.toHaveBeenCalled();
    expect(getPaymentsByUserId).not.toHaveBeenCalled();
    expect(getDeliverablesByUserId).not.toHaveBeenCalled();
  });
});

describe("GET /api/analytics - successful empty response", () => {
  it("returns all analytics sections with zeroed data", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("revenue");
    expect(body).toHaveProperty("pipeline");
    expect(body).toHaveProperty("deliverables");
    expect(body).toHaveProperty("trends");
  });

  it("returns zero revenue when no data exists", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(body.revenue.totalRevenue).toBe(0);
    expect(body.revenue.totalPending).toBe(0);
    expect(body.revenue.totalOverdue).toBe(0);
  });

  it("returns empty pipeline when no deals exist", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(body.pipeline.totalPipelineValue).toBe(0);
    expect(body.pipeline.totalDeals).toBe(0);
  });

  it("returns zero deliverable metrics when none exist", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(body.deliverables.total).toBe(0);
    expect(body.deliverables.completionRate).toBe(0);
  });
});

describe("GET /api/analytics - consolidated data with real records", () => {
  it("computes revenue from paid payments", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 10000, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: "USD" },
      { amount: 5000, status: "paid", paidDate: "2026-05-12", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=30d"));
    const body = await response.json();

    expect(body.revenue.totalRevenue).toBe(15000);
    expect(body.revenue.averagePayment).toBe(7500);
  });

  it("computes pipeline from deals", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active", totalValue: 50000, sponsorId: "s1", createdAt: new Date("2026-05-01") },
      { id: "d2", status: "draft", totalValue: 30000, sponsorId: "s1", createdAt: new Date("2026-04-01") },
      { id: "d3", status: "completed", totalValue: 20000, sponsorId: "s1", createdAt: new Date("2026-03-01") },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(body.pipeline.totalDeals).toBe(3);
  });

  it("computes deliverable metrics", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", status: "verified", dueDate: "2026-05-01", completedDate: "2026-04-28" },
      { id: "dl2", status: "pending", dueDate: "2026-05-15", completedDate: null },
      { id: "dl3", status: "in_progress", dueDate: "2026-05-16", completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=this_month"));
    const body = await response.json();

    expect(body.deliverables.total).toBe(3);
    expect(body.deliverables.verifiedCount).toBe(1);
  });

  it("includes trend data with mixed records", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 10000, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: "USD" },
    ]);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active", totalValue: 50000, sponsorId: "s1", createdAt: new Date("2026-05-01") },
    ]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", status: "verified", dueDate: "2026-05-01", completedDate: "2026-04-28" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=30d"));
    const body = await response.json();

    expect(body.trends).toBeDefined();
    expect(body.trends.revenueTrend).toBeDefined();
    expect(body.trends.completionTrend).toBeDefined();
  });
});

describe("GET /api/analytics - range parameter handling", () => {
  it("defaults to 30d when range is not provided", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.revenue).toBeDefined();
  });

  it("accepts 7d range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=7d"));
    expect(response.status).toBe(200);
  });

  it("accepts 90d range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=90d"));
    expect(response.status).toBe(200);
  });

  it("accepts this_month range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=this_month"));
    expect(response.status).toBe(200);
  });

  it("accepts last_month range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=last_month"));
    expect(response.status).toBe(200);
  });

  it("accepts this_year range parameter", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=this_year"));
    expect(response.status).toBe(200);
  });

  it("passes correct userId to all database queries", async () => {
    const customSession = { user: { id: "custom-user-42", email: "custom@test.com", name: "Custom User" } };
    mockAuth(customSession);

    await GET(makeRequest("http://localhost:3000/api/analytics"));

    expect(getDealsByUserId).toHaveBeenCalledWith("custom-user-42");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("custom-user-42");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("custom-user-42");
  });
});

describe("GET /api/analytics - edge cases", () => {
  it("handles payments with null currency", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=30d"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.revenue.totalRevenue).toBe(5000);
  });

  it("handles deals with null totalValue", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active", totalValue: null, sponsorId: "s1", createdAt: new Date() },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(200);
  });

  it("handles deliverables with null dates", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "dl1", status: "pending", dueDate: null, completedDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(200);
  });

  it("handles Date objects in deal createdAt", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active", totalValue: 1000, sponsorId: "s1", createdAt: new Date("2026-05-01") },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(200);
  });

  it("handles string values in deal createdAt", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", status: "active", totalValue: 1000, sponsorId: "s1", createdAt: "2026-05-01T00:00:00Z" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(200);
  });

  it("handles large numbers without overflow", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: Number.MAX_SAFE_INTEGER, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=30d"));
    expect(response.status).toBe(200);
  });

  it("handles mix of payment statuses correctly", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: "USD" },
      { amount: 3000, status: "pending", paidDate: null, dueDate: "2099-01-01", currency: "USD" },
      { amount: 2000, status: "overdue", paidDate: null, dueDate: "2020-01-01", currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=30d"));
    const body = await response.json();

    expect(body.revenue.totalRevenue).toBe(5000);
    expect(body.revenue.totalPending).toBe(3000);
    expect(body.revenue.totalOverdue).toBe(2000);
  });

  it("handles zero amounts", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 0, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics?range=30d"));
    const body = await response.json();
    expect(body.revenue.totalRevenue).toBe(0);
  });
});

describe("GET /api/analytics - error handling", () => {
  it("propagates database errors from deals query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(
      GET(makeRequest("http://localhost:3000/api/analytics"))
    ).rejects.toThrow("Database connection failed");
  });

  it("propagates database errors from payments query", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Payment query timeout")
    );

    await expect(
      GET(makeRequest("http://localhost:3000/api/analytics"))
    ).rejects.toThrow("Payment query timeout");
  });

  it("propagates database errors from deliverables query", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Deliverables unavailable")
    );

    await expect(
      GET(makeRequest("http://localhost:3000/api/analytics"))
    ).rejects.toThrow("Deliverables unavailable");
  });
});

describe("GET /api/analytics - response structure", () => {
  it("always includes all top-level analytics sections", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    const keys = Object.keys(body);
    expect(keys).toContain("revenue");
    expect(keys).toContain("pipeline");
    expect(keys).toContain("deliverables");
    expect(keys).toContain("trends");
  });

  it("returns JSON content type", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("revenue summary includes all expected fields", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(body.revenue).toHaveProperty("totalRevenue");
    expect(body.revenue).toHaveProperty("totalPending");
    expect(body.revenue).toHaveProperty("totalOverdue");
    expect(body.revenue).toHaveProperty("averagePayment");
    expect(body.revenue).toHaveProperty("monthOverMonthChange");
    expect(body.revenue).toHaveProperty("monthlyBreakdown");
  });

  it("pipeline summary includes expected fields", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(body.pipeline).toHaveProperty("totalPipelineValue");
    expect(body.pipeline).toHaveProperty("totalDeals");
    expect(body.pipeline).toHaveProperty("stages");
  });

  it("deliverable metrics includes expected fields", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics"));
    const body = await response.json();

    expect(body.deliverables).toHaveProperty("completionRate");
    expect(body.deliverables).toHaveProperty("verifiedCount");
    expect(body.deliverables).toHaveProperty("overdueCount");
    expect(body.deliverables).toHaveProperty("total");
  });
});
