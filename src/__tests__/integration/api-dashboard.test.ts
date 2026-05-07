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

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/dashboard", () => {
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
