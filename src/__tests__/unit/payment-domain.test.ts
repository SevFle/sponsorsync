import { describe, it, expect } from "vitest";
import {
  calculateTotalOverdue,
  calculateTotalPending,
  getDaysUntilDue,
  getDueDateStatus,
  updatePaymentSchema,
  createPaymentSchema,
  calculateTotalPaid,
  calculateTotalOutstanding,
  type DueDateStatus,
} from "@/domain/payments";

describe("calculateTotalOverdue", () => {
  it("sums only overdue payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "overdue" },
      { amount: 300, status: "pending" },
      { amount: 400, status: "overdue" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(600);
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

  it("handles single overdue payment", () => {
    expect(calculateTotalOverdue([{ amount: 500, status: "overdue" }])).toBe(500);
  });

  it("ignores unknown statuses", () => {
    const payments = [
      { amount: 100, status: "overdue" },
      { amount: 200, status: "unknown_status" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(100);
  });

  it("handles large amounts", () => {
    const payments = [
      { amount: 1000000, status: "overdue" },
      { amount: 2000000, status: "overdue" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(3000000);
  });
});

describe("calculateTotalPending", () => {
  it("sums only pending payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "pending" },
      { amount: 300, status: "overdue" },
      { amount: 400, status: "pending" },
    ];
    expect(calculateTotalPending(payments)).toBe(600);
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

  it("does not include overdue in pending", () => {
    const payments = [
      { amount: 100, status: "pending" },
      { amount: 200, status: "overdue" },
    ];
    expect(calculateTotalPending(payments)).toBe(100);
  });

  it("handles single pending payment", () => {
    expect(calculateTotalPending([{ amount: 500, status: "pending" }])).toBe(500);
  });

  it("ignores cancelled payments", () => {
    const payments = [
      { amount: 100, status: "pending" },
      { amount: 200, status: "cancelled" },
    ];
    expect(calculateTotalPending(payments)).toBe(100);
  });
});

describe("getDaysUntilDue", () => {
  it("returns null when dueDate is null", () => {
    expect(getDaysUntilDue(null)).toBeNull();
  });

  it("returns positive number for future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const result = getDaysUntilDue(future.toISOString());
    expect(result).toBe(30);
  });

  it("returns negative number for past dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const result = getDaysUntilDue(past.toISOString());
    expect(result).toBe(-5);
  });

  it("returns 0 for today", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = getDaysUntilDue(today.toISOString());
    expect(result).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = getDaysUntilDue(tomorrow.toISOString());
    expect(result).toBe(1);
  });
});

describe("getDueDateStatus", () => {
  const validStatuses = ["pending", "overdue", "paid", "cancelled"];

  it("returns 'paid' when status is 'paid'", () => {
    expect(getDueDateStatus("2025-01-01", "paid")).toBe("paid");
  });

  it("returns 'paid' when status is 'cancelled'", () => {
    expect(getDueDateStatus("2025-01-01", "cancelled")).toBe("paid");
  });

  it("returns 'no_due_date' when dueDate is null and status is not paid/cancelled", () => {
    for (const status of ["pending", "overdue"]) {
      expect(getDueDateStatus(null, status)).toBe("no_due_date");
    }
  });

  it("returns 'overdue' when due date is in the past", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    expect(getDueDateStatus(past.toISOString(), "pending")).toBe("overdue");
  });

  it("returns 'due_soon' when due date is within 7 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    expect(getDueDateStatus(soon.toISOString(), "pending")).toBe("due_soon");
  });

  it("returns 'due_soon' when due date is exactly 7 days away", () => {
    const inSevenDays = new Date();
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    expect(getDueDateStatus(inSevenDays.toISOString(), "pending")).toBe("due_soon");
  });

  it("returns 'upcoming' when due date is more than 7 days away", () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);
    expect(getDueDateStatus(later.toISOString(), "pending")).toBe("upcoming");
  });

  it("returns 'upcoming' when due date is 8 days away", () => {
    const inEightDays = new Date();
    inEightDays.setDate(inEightDays.getDate() + 8);
    expect(getDueDateStatus(inEightDays.toISOString(), "pending")).toBe("upcoming");
  });

  it("returns 'overdue' for overdue status with past date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(getDueDateStatus(past.toISOString(), "overdue")).toBe("overdue");
  });

  it("returns 'paid' for paid status regardless of date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 30);
    expect(getDueDateStatus(past.toISOString(), "paid")).toBe("paid");
  });

  it("exhaustively covers all combinations for non-terminal statuses", () => {
    const nonTerminalStatuses = ["pending", "overdue"];
    const expectedResults: Record<string, DueDateStatus> = {
      paid: "paid",
      cancelled: "paid",
    };

    for (const status of nonTerminalStatuses) {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(getDueDateStatus(past.toISOString(), status)).toBe("overdue");
    }
  });
});

describe("updatePaymentSchema", () => {
  it("accepts valid partial update with status", () => {
    const result = updatePaymentSchema.safeParse({
      status: "paid",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid partial update with amount", () => {
    const result = updatePaymentSchema.safeParse({
      amount: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid partial update with notes", () => {
    const result = updatePaymentSchema.safeParse({
      notes: "Payment received",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid partial update with invoiceUrl", () => {
    const result = updatePaymentSchema.safeParse({
      invoiceUrl: "https://invoice.example.com/inv-123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = updatePaymentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts all fields at once", () => {
    const result = updatePaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
      currency: "EUR",
      status: "paid",
      dueDate: "2025-06-01",
      paidDate: "2025-05-15",
      invoiceUrl: "https://invoice.example.com/inv-123",
      notes: "All done",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid status values", () => {
    const statuses = ["pending", "paid", "overdue", "cancelled"];
    for (const status of statuses) {
      const result = updatePaymentSchema.safeParse({ status });
      expect(result.success, `Expected "${status}" to be valid`).toBe(true);
    }
  });

  it("rejects invalid status value", () => {
    const result = updatePaymentSchema.safeParse({ status: "processing" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for dealId", () => {
    const result = updatePaymentSchema.safeParse({
      dealId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = updatePaymentSchema.safeParse({ amount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = updatePaymentSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects float amount", () => {
    const result = updatePaymentSchema.safeParse({ amount: 50.5 });
    expect(result.success).toBe(false);
  });

  it("rejects wrong-length currency", () => {
    const result = updatePaymentSchema.safeParse({ currency: "US" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid invoiceUrl", () => {
    const result = updatePaymentSchema.safeParse({ invoiceUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts null paidDate", () => {
    const result = updatePaymentSchema.safeParse({ paidDate: null });
    expect(result.success).toBe(true);
  });
});

describe("payment calculations - integration scenarios", () => {
  const mixedPayments = [
    { amount: 1000, status: "paid" },
    { amount: 2000, status: "paid" },
    { amount: 3000, status: "pending" },
    { amount: 4000, status: "overdue" },
    { amount: 5000, status: "cancelled" },
  ];

  it("calculates all totals correctly for mixed payments", () => {
    expect(calculateTotalPaid(mixedPayments)).toBe(3000);
    expect(calculateTotalOutstanding(mixedPayments)).toBe(7000);
    expect(calculateTotalOverdue(mixedPayments)).toBe(4000);
    expect(calculateTotalPending(mixedPayments)).toBe(3000);
  });

  it("outstanding equals pending + overdue", () => {
    const outstanding = calculateTotalOutstanding(mixedPayments);
    const pending = calculateTotalPending(mixedPayments);
    const overdue = calculateTotalOverdue(mixedPayments);
    expect(outstanding).toBe(pending + overdue);
  });
});
