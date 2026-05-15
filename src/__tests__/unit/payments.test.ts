import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateTotalPaid,
  calculateTotalOutstanding,
  calculateTotalOverdue,
  calculateTotalPending,
  getDaysUntilDue,
  getDueDateStatus,
  createPaymentSchema,
} from "@/domain/payments";

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

describe("calculateTotalOverdue", () => {
  it("sums only overdue payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "pending" },
      { amount: 300, status: "overdue" },
      { amount: 150, status: "overdue" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(450);
  });

  it("returns 0 when no payments are overdue", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "pending" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateTotalOverdue([])).toBe(0);
  });
});

describe("calculateTotalPending", () => {
  it("sums only pending payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "pending" },
      { amount: 300, status: "overdue" },
    ];
    expect(calculateTotalPending(payments)).toBe(200);
  });

  it("returns 0 when no payments are pending", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "overdue" },
    ];
    expect(calculateTotalPending(payments)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateTotalPending([])).toBe(0);
  });
});

describe("getDaysUntilDue", () => {
  it("returns null when dueDate is null", () => {
    expect(getDaysUntilDue(null)).toBeNull();
  });

  it("returns positive number for future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(getDaysUntilDue(future.toISOString().split("T")[0])).toBe(10);
  });

  it("returns negative number for past date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getDaysUntilDue(past.toISOString().split("T")[0])).toBe(-5);
  });

  it("returns 0 for today", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(getDaysUntilDue(today)).toBe(0);
  });
});

describe("getDueDateStatus", () => {
  it("returns 'paid' for paid status regardless of due date", () => {
    expect(getDueDateStatus("2024-01-01", "paid")).toBe("paid");
  });

  it("returns 'paid' for cancelled status regardless of due date", () => {
    expect(getDueDateStatus("2024-01-01", "cancelled")).toBe("paid");
  });

  it("returns 'no_due_date' when dueDate is null and not paid/cancelled", () => {
    expect(getDueDateStatus(null, "pending")).toBe("no_due_date");
  });

  it("returns 'overdue' when due date is in the past", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(getDueDateStatus(past.toISOString().split("T")[0], "pending")).toBe("overdue");
  });

  it("returns 'due_soon' when due date is within 7 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    expect(getDueDateStatus(soon.toISOString().split("T")[0], "pending")).toBe("due_soon");
  });

  it("returns 'due_soon' when due date is today (0 days)", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(getDueDateStatus(today, "pending")).toBe("due_soon");
  });

  it("returns 'upcoming' when due date is more than 7 days away", () => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    expect(getDueDateStatus(future.toISOString().split("T")[0], "pending")).toBe("upcoming");
  });

  it("returns 'overdue' for overdue status with past date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(getDueDateStatus(past.toISOString().split("T")[0], "overdue")).toBe("overdue");
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
