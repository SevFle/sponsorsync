import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/payments/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getEnrichedPaymentsByUserId: vi.fn(),
  createPayment: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getEnrichedPaymentsByUserId, createPayment } from "@/lib/db/queries/payments";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getEnrichedPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/payments", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns payments from enriched query", async () => {
    const mockPayments = [
      {
        id: "p1",
        dealId: "d1",
        amount: 2500,
        currency: "USD",
        status: "pending",
        dueDate: "2025-06-01",
        paidDate: null,
        invoiceUrl: null,
        notes: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        dealTitle: "Q2 Podcast Package",
        sponsorName: "Acme Corp",
      },
    ];
    (getEnrichedPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayments);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payments).toEqual(mockPayments);
    expect(getEnrichedPaymentsByUserId).toHaveBeenCalledWith("user-1");
  });

  it("returns empty payments array when no payments exist", async () => {
    (getEnrichedPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ payments: [] });
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

  it("creates a payment and returns it with status 201", async () => {
    const paymentData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 2500,
      currency: "USD",
    };
    const createdPayment = { id: "new-id", ...paymentData, status: "pending" };
    (createPayment as ReturnType<typeof vi.fn>).mockResolvedValue(createdPayment);

    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.payment).toEqual(createdPayment);
    expect(createPayment).toHaveBeenCalledWith({
      ...paymentData,
      dueDate: null,
      currency: "USD",
    });
  });

  it("handles payment with all fields", async () => {
    const paymentData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
      currency: "EUR",
      dueDate: "2025-06-01",
    };
    const createdPayment = { id: "new-id", ...paymentData, status: "pending" };
    (createPayment as ReturnType<typeof vi.fn>).mockResolvedValue(createdPayment);

    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.payment).toEqual(createdPayment);
    expect(createPayment).toHaveBeenCalledWith({
      ...paymentData,
      currency: "EUR",
      dueDate: "2025-06-01",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: "invalid json{",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 for validation failure", async () => {
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ amount: -100 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });
});
