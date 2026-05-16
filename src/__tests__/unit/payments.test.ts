import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateTotalPaid,
  calculateTotalOutstanding,
  calculateTotalOverdue,
  calculateTotalPending,
  createPaymentSchema,
  updatePaymentSchema,
  getDaysUntilDue,
  getDueDateStatus,
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

describe("calculateTotalOverdue", () => {
  it("sums only overdue payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "overdue" },
      { amount: 300, status: "overdue" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(500);
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

  it("ignores unknown statuses", () => {
    const payments = [
      { amount: 200, status: "overdue" },
      { amount: 300, status: "cancelled" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(200);
  });

  it("handles single overdue payment", () => {
    expect(calculateTotalOverdue([{ amount: 750, status: "overdue" }])).toBe(750);
  });

  it("handles large amounts", () => {
    const payments = [
      { amount: 999999999, status: "overdue" },
      { amount: 1, status: "overdue" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(1000000000);
  });

  it("returns 0 when all payments are paid", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "paid" },
    ];
    expect(calculateTotalOverdue(payments)).toBe(0);
  });
});

describe("calculateTotalPending", () => {
  it("sums only pending payments", () => {
    const payments = [
      { amount: 100, status: "paid" },
      { amount: 200, status: "pending" },
      { amount: 300, status: "pending" },
    ];
    expect(calculateTotalPending(payments)).toBe(500);
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

  it("does not include overdue in pending total", () => {
    const payments = [
      { amount: 100, status: "pending" },
      { amount: 200, status: "overdue" },
    ];
    expect(calculateTotalPending(payments)).toBe(100);
  });

  it("handles single pending payment", () => {
    expect(calculateTotalPending([{ amount: 500, status: "pending" }])).toBe(500);
  });
});

describe("updatePaymentSchema", () => {
  it("validates empty partial update", () => {
    const result = updatePaymentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates partial update with status", () => {
    const result = updatePaymentSchema.safeParse({ status: "paid" });
    expect(result.success).toBe(true);
  });

  it("validates update with all fields", () => {
    const result = updatePaymentSchema.safeParse({
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 5000,
      currency: "USD",
      status: "pending",
      dueDate: "2025-06-01",
      paidDate: "2025-05-15",
      invoiceUrl: "https://example.com/invoice.pdf",
      notes: "Paid early",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid status values", () => {
    for (const status of ["pending", "paid", "overdue", "cancelled"]) {
      const result = updatePaymentSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status value", () => {
    const result = updatePaymentSchema.safeParse({ status: "invalid" });
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
    const result = updatePaymentSchema.safeParse({ amount: 10.5 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID dealId", () => {
    const result = updatePaymentSchema.safeParse({ dealId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects currency with wrong length", () => {
    const result = updatePaymentSchema.safeParse({ currency: "US" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date for dueDate", () => {
    const result = updatePaymentSchema.safeParse({ dueDate: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("accepts null for paidDate", () => {
    const result = updatePaymentSchema.safeParse({ paidDate: null });
    expect(result.success).toBe(true);
  });

  it("accepts valid date for paidDate", () => {
    const result = updatePaymentSchema.safeParse({ paidDate: "2025-06-01" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL for invoiceUrl", () => {
    const result = updatePaymentSchema.safeParse({ invoiceUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts valid URL for invoiceUrl", () => {
    const result = updatePaymentSchema.safeParse({ invoiceUrl: "https://example.com/invoice" });
    expect(result.success).toBe(true);
  });

  it("accepts notes as string", () => {
    const result = updatePaymentSchema.safeParse({ notes: "Updated payment terms" });
    expect(result.success).toBe(true);
  });

  it("rejects numeric notes", () => {
    const result = updatePaymentSchema.safeParse({ notes: 123 });
    expect(result.success).toBe(false);
  });
});

describe("getDaysUntilDue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for null dueDate", () => {
    expect(getDaysUntilDue(null)).toBeNull();
  });

  it("returns positive number for future date", () => {
    expect(getDaysUntilDue("2025-07-15")).toBe(30);
  });

  it("returns negative number for past date", () => {
    expect(getDaysUntilDue("2025-06-05")).toBe(-10);
  });

  it("returns 0 for today", () => {
    expect(getDaysUntilDue("2025-06-15")).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    expect(getDaysUntilDue("2025-06-16")).toBe(1);
  });

  it("returns -1 for yesterday", () => {
    expect(getDaysUntilDue("2025-06-14")).toBe(-1);
  });
});

describe("getDueDateStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'paid' for paid status regardless of date", () => {
    expect(getDueDateStatus("2020-01-01", "paid")).toBe("paid");
  });

  it("returns 'paid' for cancelled status regardless of date", () => {
    expect(getDueDateStatus("2020-01-01", "cancelled")).toBe("paid");
  });

  it("returns 'no_due_date' when dueDate is null and not paid/cancelled", () => {
    expect(getDueDateStatus(null, "pending")).toBe("no_due_date");
  });

  it("returns 'no_due_date' when dueDate is null and status is overdue", () => {
    expect(getDueDateStatus(null, "overdue")).toBe("no_due_date");
  });

  it("returns 'overdue' for past dueDate with pending status", () => {
    expect(getDueDateStatus("2025-06-14", "pending")).toBe("overdue");
  });

  it("returns 'due_soon' for dueDate within 7 days", () => {
    expect(getDueDateStatus("2025-06-18", "pending")).toBe("due_soon");
  });

  it("returns 'due_soon' for dueDate exactly 7 days away", () => {
    expect(getDueDateStatus("2025-06-22", "pending")).toBe("due_soon");
  });

  it("returns 'due_soon' for dueDate 1 day away", () => {
    expect(getDueDateStatus("2025-06-16", "pending")).toBe("due_soon");
  });

  it("returns 'upcoming' for dueDate more than 7 days away", () => {
    expect(getDueDateStatus("2025-07-15", "pending")).toBe("upcoming");
  });

  it("returns 'upcoming' for dueDate exactly 8 days away", () => {
    expect(getDueDateStatus("2025-06-23", "pending")).toBe("upcoming");
  });

  it("returns 'overdue' for overdue status with past date", () => {
    expect(getDueDateStatus("2025-06-10", "overdue")).toBe("overdue");
  });

  it("returns 'due_soon' for overdue status with soon date", () => {
    expect(getDueDateStatus("2025-06-17", "overdue")).toBe("due_soon");
  });

  it("prioritizes 'paid' status over date logic", () => {
    expect(getDueDateStatus("2020-01-01", "paid")).toBe("paid");
  });
});
