import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/analytics/trends/route";

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

import { getServerSession } from "next-auth";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/analytics/trends - auth guards", () => {
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

  it("returns 401 when session user is null", async () => {
    mockAuth({ user: null } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET();
    expect(getDealsByUserId).not.toHaveBeenCalled();
    expect(getPaymentsByUserId).not.toHaveBeenCalled();
    expect(getDeliverablesByUserId).not.toHaveBeenCalled();
  });

  it("returns JSON content type for 401", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("GET /api/analytics/trends - successful responses", () => {
  it("returns empty trend arrays when no data exists", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.revenueTrend).toEqual([]);
    expect(body.dealTrend).toEqual([]);
    expect(body.completionTrend).toEqual([]);
    expect(body.revenueChange).toBe(0);
    expect(body.dealChange).toBe(0);
    expect(body.completionChange).toBe(0);
  });

  it("computes revenue trend from paid payments", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null, currency: "USD" },
      { amount: 7000, status: "paid", paidDate: "2025-02-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.revenueTrend).toHaveLength(2);
    expect(body.revenueTrend[0].period).toBe("2025-01");
    expect(body.revenueTrend[0].value).toBe(5000);
    expect(body.revenueTrend[1].period).toBe("2025-02");
    expect(body.revenueTrend[1].value).toBe(7000);
  });

  it("computes deal trend from deal creation dates", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "active", totalValue: 5000, createdAt: new Date("2025-01-15") },
      { status: "completed", totalValue: 3000, createdAt: new Date("2025-02-15") },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.dealTrend).toHaveLength(2);
    expect(body.dealTrend[0].period).toBe("2025-01");
    expect(body.dealTrend[0].value).toBe(1);
    expect(body.dealTrend[1].period).toBe("2025-02");
    expect(body.dealTrend[1].value).toBe(1);
  });

  it("computes completion trend from verified deliverables", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "verified", dueDate: "2025-01-30", completedDate: "2025-01-15" },
      { status: "verified", dueDate: "2025-02-28", completedDate: "2025-02-15" },
      { status: "pending", dueDate: "2025-03-30", completedDate: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.completionTrend).toHaveLength(2);
    expect(body.completionTrend[0].value).toBe(1);
    expect(body.completionTrend[1].value).toBe(1);
  });

  it("queries all three data sources in parallel", async () => {
    const promiseAllSpy = vi.spyOn(Promise, "all");

    await GET();

    expect(promiseAllSpy).toHaveBeenCalledTimes(1);
    expect(getDealsByUserId).toHaveBeenCalledWith("user-1");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("user-1");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("user-1");
  });

  it("computes revenue change between periods", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null, currency: "USD" },
      { amount: 10000, status: "paid", paidDate: "2025-02-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.revenueChange).toBe(100);
  });

  it("passes correct userId to all database queries", async () => {
    const customSession = { user: { id: "custom-user-42", email: "custom@test.com" } };
    mockAuth(customSession);

    await GET();

    expect(getDealsByUserId).toHaveBeenCalledWith("custom-user-42");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("custom-user-42");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("custom-user-42");
  });
});

describe("GET /api/analytics/trends - edge cases", () => {
  it("excludes non-paid payments from revenue trend", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null, currency: "USD" },
      { amount: 3000, status: "pending", paidDate: null, dueDate: null, currency: "USD" },
      { amount: 2000, status: "overdue", paidDate: null, dueDate: "2025-01-01", currency: "USD" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.revenueTrend).toHaveLength(1);
    expect(body.revenueTrend[0].value).toBe(5000);
  });

  it("excludes paid payments without paidDate from revenue trend", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: null, dueDate: null, currency: "USD" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.revenueTrend).toEqual([]);
  });

  it("excludes non-verified deliverables from completion trend", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "pending", dueDate: "2025-01-30", completedDate: null },
      { status: "in_progress", dueDate: "2025-02-28", completedDate: null },
      { status: "submitted", dueDate: "2025-03-30", completedDate: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.completionTrend).toEqual([]);
  });

  it("handles deals with createdAt as Date instance", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "active", totalValue: 1000, createdAt: new Date("2025-03-15") },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.dealTrend).toHaveLength(1);
    expect(body.dealTrend[0].period).toBe("2025-03");
  });

  it("handles deals with createdAt as ISO string", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "active", totalValue: 1000, createdAt: "2025-03-15T00:00:00.000Z" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.dealTrend).toHaveLength(1);
  });

  it("handles null currency field in payments", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null, currency: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.revenueTrend).toHaveLength(1);
  });

  it("handles null completedDate on verified deliverables", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "verified", dueDate: "2025-01-30", completedDate: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.completionTrend).toEqual([]);
  });

  it("returns zero change values when single period", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { amount: 5000, status: "paid", paidDate: "2025-01-15", dueDate: null, currency: "USD" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.revenueChange).toBe(0);
    expect(body.dealChange).toBe(0);
    expect(body.completionChange).toBe(0);
  });
});

describe("GET /api/analytics/trends - error propagation", () => {
  it("propagates database errors from deals query", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(GET()).rejects.toThrow("Database connection failed");
  });

  it("propagates database errors from payments query", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Query timeout")
    );

    await expect(GET()).rejects.toThrow("Query timeout");
  });

  it("propagates database errors from deliverables query", async () => {
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Connection refused")
    );

    await expect(GET()).rejects.toThrow("Connection refused");
  });
});

describe("GET /api/analytics/trends - response structure", () => {
  it("always includes all trend summary fields", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty("revenueTrend");
    expect(body).toHaveProperty("dealTrend");
    expect(body).toHaveProperty("completionTrend");
    expect(body).toHaveProperty("revenueChange");
    expect(body).toHaveProperty("dealChange");
    expect(body).toHaveProperty("completionChange");
    expect(Array.isArray(body.revenueTrend)).toBe(true);
    expect(Array.isArray(body.dealTrend)).toBe(true);
    expect(Array.isArray(body.completionTrend)).toBe(true);
  });

  it("returns JSON content type for 200 response", async () => {
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
