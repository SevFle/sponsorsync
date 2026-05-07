import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const selectWhere = vi.fn();
  const selectInnerJoin = vi.fn(() => ({ where: selectWhere }));
  const selectFrom = vi.fn(() => ({ where: selectWhere, innerJoin: selectInnerJoin }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const insertReturning = vi.fn();
  const insertValues = vi.fn(() => ({ returning: insertReturning }));
  const insert = vi.fn(() => ({ values: insertValues }));

  const updateReturning = vi.fn();
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const deleteReturning = vi.fn();
  const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
  const deleteFn = vi.fn(() => ({ where: deleteWhere }));

  return {
    select, selectFrom, selectWhere, selectInnerJoin,
    insert, insertValues, insertReturning,
    update, updateSet, updateWhere, updateReturning,
    deleteFn, deleteWhere, deleteReturning,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.deleteFn,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  payments: {
    id: "id",
    dealId: "deal_id",
    amount: "amount",
    currency: "currency",
    status: "status",
    dueDate: "due_date",
    paidDate: "paid_date",
    invoiceUrl: "invoice_url",
    notes: "notes",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  deals: {
    id: "id",
    userId: "user_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
}));

import {
  getPaymentsByDealId,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentsByUserId,
} from "@/lib/db/queries/payments";

const samplePayment = {
  id: "pay-1",
  dealId: "deal-1",
  amount: 5000,
  currency: "USD",
  status: "pending" as const,
  dueDate: "2025-06-01",
  paidDate: null,
  invoiceUrl: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPaymentsByDealId", () => {
  it("returns payments for a given deal id", async () => {
    mocks.selectWhere.mockResolvedValue([samplePayment]);
    const result = await getPaymentsByDealId("deal-1");
    expect(result).toEqual([samplePayment]);
    expect(mocks.select).toHaveBeenCalled();
  });

  it("returns empty array when deal has no payments", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getPaymentsByDealId("no-deal");
    expect(result).toEqual([]);
  });

  it("returns multiple payments for a deal", async () => {
    const payments = [samplePayment, { ...samplePayment, id: "pay-2", amount: 2500 }];
    mocks.selectWhere.mockResolvedValue(payments);
    const result = await getPaymentsByDealId("deal-1");
    expect(result).toHaveLength(2);
  });
});

describe("getPaymentById", () => {
  it("returns payment when found with user scoping", async () => {
    mocks.selectWhere.mockResolvedValue([samplePayment]);
    const result = await getPaymentById("pay-1", "user-1");
    expect(result).toEqual(samplePayment);
  });

  it("returns undefined when not found", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getPaymentById("nonexistent", "user-1");
    expect(result).toBeUndefined();
  });

  it("calls innerJoin for ownership check", async () => {
    mocks.selectWhere.mockResolvedValue([samplePayment]);
    await getPaymentById("pay-1", "user-1");
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
  });
});

describe("createPayment", () => {
  it("creates and returns a payment", async () => {
    mocks.insertReturning.mockResolvedValue([samplePayment]);
    const data = { dealId: "deal-1", amount: 5000 };
    const result = await createPayment(data);
    expect(result).toEqual(samplePayment);
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalledWith(data);
  });

  it("returns undefined when insert returns empty", async () => {
    mocks.insertReturning.mockResolvedValue([]);
    const result = await createPayment({ dealId: "deal-1", amount: 100 });
    expect(result).toBeUndefined();
  });
});

describe("updatePayment", () => {
  it("updates and returns the payment when owned by user", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "pay-1" }]);
    const updated = { ...samplePayment, status: "paid" as const };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updatePayment("pay-1", { status: "paid" }, "user-1");
    expect(result).toEqual(updated);
    expect(mocks.updateSet).toHaveBeenCalledWith({ status: "paid" });
  });

  it("returns undefined when payment not found for user", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await updatePayment("nonexistent", { amount: 100 }, "user-1");
    expect(result).toBeUndefined();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates paidDate when marking as paid", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "pay-1" }]);
    const updated = { ...samplePayment, status: "paid" as const, paidDate: "2025-05-01" };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updatePayment("pay-1", { status: "paid", paidDate: "2025-05-01" }, "user-1");
    expect(result?.status).toBe("paid");
    expect(result?.paidDate).toBe("2025-05-01");
  });

  it("performs ownership check before update", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "pay-1" }]);
    mocks.updateReturning.mockResolvedValue([samplePayment]);
    await updatePayment("pay-1", { status: "paid" }, "user-1");
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
  });
});

describe("deletePayment", () => {
  it("deletes and returns the payment when owned by user", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "pay-1" }]);
    mocks.deleteReturning.mockResolvedValue([samplePayment]);
    const result = await deletePayment("pay-1", "user-1");
    expect(result).toEqual(samplePayment);
    expect(mocks.deleteFn).toHaveBeenCalled();
  });

  it("returns undefined when payment not found for user", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await deletePayment("nonexistent", "user-1");
    expect(result).toBeUndefined();
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });

  it("performs ownership check before delete", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "pay-1" }]);
    mocks.deleteReturning.mockResolvedValue([samplePayment]);
    await deletePayment("pay-1", "user-1");
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
    expect(mocks.deleteFn).toHaveBeenCalled();
  });
});

describe("getPaymentsByUserId", () => {
  it("returns payments for a given user id via join", async () => {
    mocks.selectWhere.mockResolvedValue([samplePayment]);
    const result = await getPaymentsByUserId("user-1");
    expect(result).toEqual([samplePayment]);
    expect(mocks.select).toHaveBeenCalled();
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
    expect(mocks.selectWhere).toHaveBeenCalled();
  });

  it("returns empty array when user has no payments", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getPaymentsByUserId("user-no-payments");
    expect(result).toEqual([]);
  });

  it("returns multiple payments for a user", async () => {
    const pays = [samplePayment, { ...samplePayment, id: "pay-2", amount: 2500 }];
    mocks.selectWhere.mockResolvedValue(pays);
    const result = await getPaymentsByUserId("user-1");
    expect(result).toHaveLength(2);
  });
});
