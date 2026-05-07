import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/payments/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/payments", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns empty payments array", async () => {
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
    const request = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.payment).toEqual(paymentData);
  });

  it("handles payment with all fields", async () => {
    const paymentData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
      currency: "EUR",
      status: "pending",
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
    expect(body.payment).toEqual(paymentData);
  });
});
