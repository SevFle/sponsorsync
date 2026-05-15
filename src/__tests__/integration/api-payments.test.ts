import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/payments/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentsByUserId: vi.fn(),
  createPayment: vi.fn(),
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
  getDealById: vi.fn(),
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getPaymentsByUserId, createPayment } from "@/lib/db/queries/payments";
import { getDealsByUserId, getDealById } from "@/lib/db/queries/deals";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (createPayment as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

describe("GET /api/payments", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 when session user has no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@test.com" },
    });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns empty payments array for authenticated user with no payments", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payments).toEqual([]);
    expect(getPaymentsByUserId).toHaveBeenCalledWith("user-1");
    expect(getDealsByUserId).toHaveBeenCalledWith("user-1");
    expect(getSponsorsByUserId).toHaveBeenCalledWith("user-1");
  });

  it("returns enriched payments with sponsor names and deal titles", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "pay-1",
        dealId: "deal-1",
        amount: 2500,
        currency: "USD",
        status: "paid",
        dueDate: "2025-01-10",
        paidDate: "2025-01-09",
        invoiceUrl: null,
        notes: null,
        createdAt: new Date("2025-01-05"),
        updatedAt: new Date("2025-01-09"),
      },
    ]);

    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "Q2 Podcast Package",
        description: null,
        status: "active",
        totalValue: 10000,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sponsor-1", name: "Acme Corp" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0].id).toBe("pay-1");
    expect(body.payments[0].dealId).toBe("deal-1");
    expect(body.payments[0].amount).toBe(2500);
    expect(body.payments[0].currency).toBe("USD");
    expect(body.payments[0].status).toBe("paid");
    expect(body.payments[0].dueDate).toBe("2025-01-10");
    expect(body.payments[0].paidDate).toBe("2025-01-09");
    expect(body.payments[0].dealTitle).toBe("Q2 Podcast Package");
    expect(body.payments[0].sponsorName).toBe("Acme Corp");
  });

  it("shows Unknown sponsor when sponsor not found", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "pay-1",
        dealId: "deal-1",
        amount: 1000,
        currency: null,
        status: "pending",
        dueDate: null,
        paidDate: null,
        invoiceUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-missing",
        title: "Orphan Deal",
        description: null,
        status: "draft",
        totalValue: null,
        currency: null,
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.payments[0].sponsorName).toBe("Unknown");
    expect(body.payments[0].currency).toBe("USD");
  });

  it("shows Unknown Deal when deal not found", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "pay-1",
        dealId: "deal-missing",
        amount: 500,
        currency: "USD",
        status: "overdue",
        dueDate: "2024-12-01",
        paidDate: null,
        invoiceUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.payments[0].dealTitle).toBe("Unknown Deal");
    expect(body.payments[0].sponsorName).toBe("Unknown");
  });

  it("uses Promise.all for parallel queries", async () => {
    const promiseAllSpy = vi.spyOn(Promise, "all");

    await GET();

    expect(promiseAllSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when database query fails", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection lost")
    );

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch payments");
  });

  it("returns 500 when deals query fails", async () => {
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection lost")
    );

    const response = await GET();
    expect(response.status).toBe(500);
  });

  it("returns 500 when sponsors query fails", async () => {
    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB connection lost")
    );

    const response = await GET();
    expect(response.status).toBe(500);
  });

  it("enriches multiple payments correctly", async () => {
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "pay-1",
        dealId: "deal-1",
        amount: 1000,
        currency: "USD",
        status: "paid",
        dueDate: "2025-01-01",
        paidDate: "2025-01-01",
        invoiceUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "pay-2",
        dealId: "deal-2",
        amount: 2000,
        currency: "EUR",
        status: "pending",
        dueDate: "2025-06-01",
        paidDate: null,
        invoiceUrl: "https://invoice.example.com/2",
        notes: "Net 30",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "deal-1",
        userId: "user-1",
        sponsorId: "sponsor-1",
        title: "Deal One",
        description: null,
        status: "active",
        totalValue: 5000,
        currency: "USD",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "deal-2",
        userId: "user-1",
        sponsorId: "sponsor-2",
        title: "Deal Two",
        description: null,
        status: "active",
        totalValue: 8000,
        currency: "EUR",
        startDate: null,
        endDate: null,
        contractUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (getSponsorsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "sponsor-1", name: "Sponsor A" },
      { id: "sponsor-2", name: "Sponsor B" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.payments).toHaveLength(2);
    expect(body.payments[0].sponsorName).toBe("Sponsor A");
    expect(body.payments[0].dealTitle).toBe("Deal One");
    expect(body.payments[1].sponsorName).toBe("Sponsor B");
    expect(body.payments[1].dealTitle).toBe("Deal Two");
    expect(body.payments[1].invoiceUrl).toBe("https://invoice.example.com/2");
    expect(body.payments[1].notes).toBe("Net 30");
  });
});

describe("POST /api/payments", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session user has no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@test.com" },
    });
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: "not-json{",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 when body fails schema validation", async () => {
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 422 when dealId is not a UUID", async () => {
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ dealId: "not-a-uuid", amount: 2500 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("returns 422 when amount is negative", async () => {
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({
        dealId: "550e8400-e29b-41d4-a716-446655440000",
        amount: -100,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("returns 404 when deal does not belong to user", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const paymentData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 2500,
      currency: "USD",
    };
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Deal not found or access denied");
  });

  it("creates a payment and returns it with status 201", async () => {
    const dealId = "550e8400-e29b-41d4-a716-446655440000";
    const mockDeal = { id: dealId, userId: "user-1", title: "Test Deal" };
    const mockPayment = {
      id: "pay-new",
      dealId,
      amount: 2500,
      currency: "USD",
      status: "pending",
      dueDate: null,
    };

    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeal);
    (createPayment as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayment);

    const paymentData = {
      dealId,
      amount: 2500,
      currency: "USD",
    };
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.payment).toEqual(mockPayment);
    expect(getDealById).toHaveBeenCalledWith(dealId, "user-1");
    expect(createPayment).toHaveBeenCalledWith({
      dealId,
      amount: 2500,
      currency: "USD",
      dueDate: null,
      status: "pending",
    });
  });

  it("creates a payment with all optional fields", async () => {
    const dealId = "550e8400-e29b-41d4-a716-446655440000";
    const mockDeal = { id: dealId, userId: "user-1" };
    const mockPayment = {
      id: "pay-new",
      dealId,
      amount: 5000,
      currency: "EUR",
      status: "pending",
      dueDate: "2025-06-01",
    };

    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeal);
    (createPayment as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayment);

    const paymentData = {
      dealId,
      amount: 5000,
      currency: "EUR",
      dueDate: "2025-06-01",
    };
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.payment).toEqual(mockPayment);
    expect(createPayment).toHaveBeenCalledWith({
      dealId,
      amount: 5000,
      currency: "EUR",
      dueDate: "2025-06-01",
      status: "pending",
    });
  });

  it("returns 500 when createPayment fails", async () => {
    const dealId = "550e8400-e29b-41d4-a716-446655440000";
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: dealId });
    (createPayment as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ dealId, amount: 2500 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to create payment");
  });

  it("defaults currency to USD when not provided", async () => {
    const dealId = "550e8400-e29b-41d4-a716-446655440000";
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: dealId });
    (createPayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "pay-1" });

    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ dealId, amount: 1000 }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(request);

    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD" })
    );
  });
});
