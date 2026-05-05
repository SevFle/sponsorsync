import { describe, it, expect } from "vitest";
import { calculateTotalPaid, calculateTotalOutstanding } from "@/domain/payments";

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
});
