import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/payments/route";
import { GET as GetById, PATCH, DELETE } from "@/app/api/payments/[id]/route";

describe("GET /api/payments", () => {
  it("returns empty payments array", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ payments: [] });
  });
});

describe("POST /api/payments", () => {
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

describe("GET /api/payments/[id]", () => {
  it("returns payment with matching id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/payments/pay-123"),
      { params: Promise.resolve({ id: "pay-123" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payment).toEqual({ id: "pay-123" });
  });
});

describe("PATCH /api/payments/[id]", () => {
  it("updates payment and returns merged data", async () => {
    const updateData = { status: "paid" };
    const request = new Request("http://localhost:3000/api/payments/pay-123", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "pay-123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payment).toEqual({ id: "pay-123", status: "paid" });
  });
});

describe("DELETE /api/payments/[id]", () => {
  it("returns deleted true with status 200", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/payments/pay-123", { method: "DELETE" }),
      { params: Promise.resolve({ id: "pay-123" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});
