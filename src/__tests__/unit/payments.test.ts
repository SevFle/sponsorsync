import { describe, it, expect } from "vitest";
import { calculateTotalPaid, calculateTotalOutstanding, createPaymentSchema } from "@/domain/payments";

describe("calculateTotalPaid", () => {
  it("sums only paid payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "pending" },
      { amount: 300, status: "paid" },
    ];
    expect(calculateTotalPaid(payments)).toBe(400);
  });

  it("returns 0 when no payments are paid", () => {
    const payments = [
      { amount: 100, status: "pending" },
      { amount: 200, status: "overdue" },
    ];
    expect(calculateTotalPaid(payments)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateTotalPaid([])).toBe(0);
  });

  it("handles single paid payment", () => {
    expect(calculateTotalPaid([{ amount: 500, status: "paid" }])).toBe(500);
  });

  it("ignores unknown statuses", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "unknown_status" },
    ];
    expect(calculateTotalPaid(payments)).toBe(100);
  });
});

describe("calculateTotalOutstanding", () => {
  it("sums pending and overdue payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "pending" },
      { amount: 300, status: "overdue" },
    ];
    expect(calculateTotalOutstanding(payments)).toBe(500);
  });

  it("returns 0 when all payments are paid", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "paid" },
    ];
    expect(calculateTotalOutstanding(payments)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateTotalOutstanding([])).toBe(0);
  });

  it("sums only pending when no overdue", () => {
    const payments = [
      { amount: 100, status: "pending" },
      { amount: 200, status: "paid" },
    ];
    expect(calculateTotalOutstanding(payments)).toBe(100);
  });

  it("sums only overdue when no pending", () => {
    const payments = [
      { amount: 300, status: "overdue" },
      { amount: 200, status: "paid" },
    ];
    expect(calculateTotalOutstanding(payments)).toBe(300);
  });
});

describe("createPaymentSchema", () => {
  it("validates a valid payment input", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("validates with all optional fields", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
      currency: "USD",
      dueDate: "2025-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for dealId", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "not-a-uuid",
      amount: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing dealId", () => {
    const result = createPaymentSchema.safeParse({
      amount: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing amount", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects float amount", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 50.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects currency with wrong length", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
      currency: "US",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format for dueDate", () => {
    const result = createPaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
      dueDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});
