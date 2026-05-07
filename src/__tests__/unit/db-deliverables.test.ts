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
  deliverables: {
    id: "id",
    dealId: "deal_id",
    title: "title",
    description: "description",
    status: "status",
    dueDate: "due_date",
    completedDate: "completed_date",
    verificationData: "verification_data",
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
  getDeliverablesByDealId,
  getDeliverableById,
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  getDeliverablesByUserId,
} from "@/lib/db/queries/deliverables";

const sampleDeliverable = {
  id: "deliv-1",
  dealId: "deal-1",
  title: "Podcast Ad Read",
  description: "Mid-roll ad read",
  status: "pending" as const,
  dueDate: "2025-06-01",
  completedDate: null,
  verificationData: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDeliverablesByDealId", () => {
  it("returns deliverables for a given deal id", async () => {
    mocks.selectWhere.mockResolvedValue([sampleDeliverable]);
    const result = await getDeliverablesByDealId("deal-1");
    expect(result).toEqual([sampleDeliverable]);
    expect(mocks.select).toHaveBeenCalled();
  });

  it("returns empty array when deal has no deliverables", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getDeliverablesByDealId("no-deal");
    expect(result).toEqual([]);
  });

  it("returns multiple deliverables for a deal", async () => {
    const delivs = [
      sampleDeliverable,
      { ...sampleDeliverable, id: "deliv-2", title: "Newsletter Mention" },
    ];
    mocks.selectWhere.mockResolvedValue(delivs);
    const result = await getDeliverablesByDealId("deal-1");
    expect(result).toHaveLength(2);
  });
});

describe("getDeliverableById", () => {
  it("returns deliverable when found with user scoping", async () => {
    mocks.selectWhere.mockResolvedValue([sampleDeliverable]);
    const result = await getDeliverableById("deliv-1", "user-1");
    expect(result).toEqual(sampleDeliverable);
  });

  it("returns undefined when not found", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getDeliverableById("nonexistent", "user-1");
    expect(result).toBeUndefined();
  });

  it("calls innerJoin for ownership check", async () => {
    mocks.selectWhere.mockResolvedValue([sampleDeliverable]);
    await getDeliverableById("deliv-1", "user-1");
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
  });
});

describe("createDeliverable", () => {
  it("creates and returns a deliverable", async () => {
    mocks.insertReturning.mockResolvedValue([sampleDeliverable]);
    const data = { dealId: "deal-1", title: "Podcast Ad Read" };
    const result = await createDeliverable(data);
    expect(result).toEqual(sampleDeliverable);
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalledWith(data);
  });

  it("returns undefined when insert returns empty", async () => {
    mocks.insertReturning.mockResolvedValue([]);
    const result = await createDeliverable({ dealId: "deal-1", title: "Test" });
    expect(result).toBeUndefined();
  });
});

describe("updateDeliverable", () => {
  it("updates and returns the deliverable when owned by user", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "deliv-1" }]);
    const updated = { ...sampleDeliverable, status: "in_progress" as const };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updateDeliverable("deliv-1", { status: "in_progress" }, "user-1");
    expect(result).toEqual(updated);
    expect(mocks.updateSet).toHaveBeenCalledWith({ status: "in_progress" });
  });

  it("returns undefined when deliverable not found for user", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await updateDeliverable("nonexistent", { title: "X" }, "user-1");
    expect(result).toBeUndefined();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("performs ownership check before update", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "deliv-1" }]);
    mocks.updateReturning.mockResolvedValue([sampleDeliverable]);
    await updateDeliverable("deliv-1", { title: "New" }, "user-1");
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
  });
});

describe("deleteDeliverable", () => {
  it("deletes and returns the deliverable when owned by user", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "deliv-1" }]);
    mocks.deleteReturning.mockResolvedValue([sampleDeliverable]);
    const result = await deleteDeliverable("deliv-1", "user-1");
    expect(result).toEqual(sampleDeliverable);
    expect(mocks.deleteFn).toHaveBeenCalled();
  });

  it("returns undefined when deliverable not found for user", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await deleteDeliverable("nonexistent", "user-1");
    expect(result).toBeUndefined();
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });

  it("performs ownership check before delete", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: "deliv-1" }]);
    mocks.deleteReturning.mockResolvedValue([sampleDeliverable]);
    await deleteDeliverable("deliv-1", "user-1");
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
    expect(mocks.deleteFn).toHaveBeenCalled();
  });
});

describe("getDeliverablesByUserId", () => {
  it("returns deliverables for a given user id via join", async () => {
    mocks.selectWhere.mockResolvedValue([sampleDeliverable]);
    const result = await getDeliverablesByUserId("user-1");
    expect(result).toEqual([sampleDeliverable]);
    expect(mocks.select).toHaveBeenCalled();
    expect(mocks.selectInnerJoin).toHaveBeenCalled();
    expect(mocks.selectWhere).toHaveBeenCalled();
  });

  it("returns empty array when user has no deliverables", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getDeliverablesByUserId("user-no-deliverables");
    expect(result).toEqual([]);
  });

  it("returns multiple deliverables for a user", async () => {
    const delivs = [
      sampleDeliverable,
      { ...sampleDeliverable, id: "deliv-2", title: "Newsletter Mention" },
    ];
    mocks.selectWhere.mockResolvedValue(delivs);
    const result = await getDeliverablesByUserId("user-1");
    expect(result).toHaveLength(2);
  });
});
