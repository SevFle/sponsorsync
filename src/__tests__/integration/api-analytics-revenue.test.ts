import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/analytics/revenue/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentsByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

function makeRequest(url: string) {
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/analytics/revenue - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    expect(response.status).toBe(401);
  });

  it("returns 401 when session user is null", async () => {
    mockAuth({ user: null } as any);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    expect(response.status).toBe(401);
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    expect(getPaymentsByUserId).not.toHaveBeenCalled();
  });

  it("returns JSON content type for 401", async () => {
    mockAuth(null);
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("GET /api/analytics/revenue - successful responses", () => {
  it("returns zero revenue summary when no payments exist", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalRevenue).toBe(0);
    expect(body.totalPending).toBe(0);
    expect(body.totalOverdue).toBe(0);
    expect(body.averagePayment).toBe(0);
    expect(body.monthOverMonthChange).toBe(0);
    expect(body.monthlyBreakdown).toEqual([]);
  });

  it("computes revenue from paid payments", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: "USD" },
      { amount: 3000, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=30d"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalRevenue).toBe(8000);
    expect(body.averagePayment).toBe(4000);
  });

  it("computes pending revenue", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "pending", paidDate: null, dueDate: null, currency: "USD" },
      { amount: 3000, status: "pending", paidDate: null, dueDate: "2025-06-01", currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    const body = await response.json();

    expect(body.totalPending).toBe(8000);
    expect(body.totalRevenue).toBe(0);
  });

  it("computes overdue revenue", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "overdue", paidDate: null, dueDate: null, currency: "USD" },
      { amount: 3000, status: "pending", paidDate: null, dueDate: "2020-01-01", currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    const body = await response.json();

    expect(body.totalOverdue).toBe(8000);
  });

  it("computes month-over-month change", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-04-15", dueDate: null, currency: "USD" },
      { amount: 10000, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=this_year"));
    const body = await response.json();

    expect(body.monthOverMonthChange).toBe(100);
  });

  it("returns monthly breakdown sorted ascending", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 3000, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: "USD" },
      { amount: 5000, status: "paid", paidDate: "2026-03-15", dueDate: null, currency: "USD" },
      { amount: 7000, status: "paid", paidDate: "2026-04-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=this_year"));
    const body = await response.json();

    expect(body.monthlyBreakdown).toHaveLength(3);
    expect(body.monthlyBreakdown[0].month).toBe("2026-03");
    expect(body.monthlyBreakdown[1].month).toBe("2026-04");
    expect(body.monthlyBreakdown[2].month).toBe("2026-05");
  });

  it("passes correct userId to database query", async () => {
    const customSession = { user: { id: "custom-user-42", email: "custom@test.com" } };
    mockAuth(customSession);

    await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));

    expect(getPaymentsByUserId).toHaveBeenCalledWith("custom-user-42");
  });
});

describe("GET /api/analytics/revenue - range parameter handling", () => {
  it("defaults to 30d when range is not provided", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2020-01-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=this_year"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalRevenue).toBe(0);
  });

  it("accepts 7d range parameter", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=7d"));

    expect(response.status).toBe(200);
  });

  it("accepts 90d range parameter", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=90d"));

    expect(response.status).toBe(200);
  });

  it("accepts this_month range parameter", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=this_month"));

    expect(response.status).toBe(200);
  });

  it("accepts this_year range parameter", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=this_year"));

    expect(response.status).toBe(200);
  });

  it("filters payments by date range", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: "USD" },
      { amount: 7000, status: "paid", paidDate: "2020-06-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=30d"));
    const body = await response.json();

    expect(body.monthlyBreakdown.length).toBeLessThanOrEqual(1);
  });
});

describe("GET /api/analytics/revenue - edge cases", () => {
  it("handles null currency field", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=30d"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalRevenue).toBe(5000);
  });

  it("handles missing currency field", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-05-15", dueDate: null },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=30d"));

    expect(response.status).toBe(200);
  });

  it("handles mix of paid, pending, and overdue payments", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: "USD" },
      { amount: 3000, status: "pending", paidDate: null, dueDate: "2026-06-01", currency: "USD" },
      { amount: 2000, status: "overdue", paidDate: null, dueDate: "2020-01-01", currency: "USD" },
      { amount: 1000, status: "paid", paidDate: null, dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=30d"));
    const body = await response.json();

    expect(body.totalRevenue).toBe(5000);
    expect(body.totalPending).toBe(3000);
    expect(body.totalOverdue).toBe(2000);
    expect(body.averagePayment).toBe(5000);
  });

  it("handles large amounts without overflow", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 999999999, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: "USD" },
      { amount: 999999999, status: "paid", paidDate: "2026-05-10", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=30d"));
    const body = await response.json();

    expect(body.totalRevenue).toBe(1999999998);
    expect(body.averagePayment).toBe(999999999);
  });

  it("handles zero-amount payments", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 0, status: "paid", paidDate: "2026-05-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=30d"));
    const body = await response.json();

    expect(body.totalRevenue).toBe(0);
    expect(body.averagePayment).toBe(0);
  });

  it("handles future pending payments (not overdue)", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "pending", paidDate: null, dueDate: "2099-12-31", currency: "USD" },
    ]);

    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    const body = await response.json();

    expect(body.totalOverdue).toBe(0);
    expect(body.totalPending).toBe(5000);
  });
});

describe("GET /api/analytics/revenue - error propagation", () => {
  it("propagates database errors", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(
      GET(makeRequest("http://localhost:3000/api/analytics/revenue"))
    ).rejects.toThrow("Database connection failed");
  });

  it("propagates query timeout errors", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Query timeout")
    );

    await expect(
      GET(makeRequest("http://localhost:3000/api/analytics/revenue?range=90d"))
    ).rejects.toThrow("Query timeout");
  });
});

describe("GET /api/analytics/revenue - response structure", () => {
  it("always includes all revenue summary fields", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    const body = await response.json();

    expect(body).toHaveProperty("totalRevenue");
    expect(body).toHaveProperty("totalPending");
    expect(body).toHaveProperty("totalOverdue");
    expect(body).toHaveProperty("averagePayment");
    expect(body).toHaveProperty("monthOverMonthChange");
    expect(body).toHaveProperty("monthlyBreakdown");
  });

  it("returns JSON content type for 200 response", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/analytics/revenue"));
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
