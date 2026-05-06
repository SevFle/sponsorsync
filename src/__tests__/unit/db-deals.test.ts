import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const selectWhere = vi.fn();
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
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
    select, selectFrom, selectWhere,
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
  deals: {
    id: "id",
    userId: "user_id",
    sponsorId: "sponsor_id",
    title: "title",
    description: "description",
    status: "status",
    totalValue: "total_value",
    currency: "currency",
    startDate: "start_date",
    endDate: "end_date",
    contractUrl: "contract_url",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...clauses) => ({ and: clauses })),
}));

import { getDealsByUserId, getDealById, createDeal, updateDeal, deleteDeal } from "@/lib/db/queries/deals";

const sampleDeal = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-1",
  sponsorId: "sponsor-1",
  title: "Sponsorship Deal",
  description: "A great deal",
  status: "draft" as const,
  totalValue: 5000,
  currency: "USD",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  contractUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDealsByUserId", () => {
  it("returns deals for a given user id", async () => {
    mocks.selectWhere.mockResolvedValue([sampleDeal]);
    const result = await getDealsByUserId("user-1");
    expect(result).toEqual([sampleDeal]);
    expect(mocks.select).toHaveBeenCalled();
    expect(mocks.selectFrom).toHaveBeenCalled();
    expect(mocks.selectWhere).toHaveBeenCalled();
  });

  it("returns empty array when user has no deals", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getDealsByUserId("user-no-deals");
    expect(result).toEqual([]);
  });

  it("returns multiple deals for a user", async () => {
    const deals = [sampleDeal, { ...sampleDeal, id: "deal-2", title: "Second Deal" }];
    mocks.selectWhere.mockResolvedValue(deals);
    const result = await getDealsByUserId("user-1");
    expect(result).toHaveLength(2);
  });
});

const userId = "user-1";

describe("getDealById", () => {
  it("returns deal when found", async () => {
    mocks.selectWhere.mockResolvedValue([sampleDeal]);
    const result = await getDealById("550e8400-e29b-41d4-a716-446655440000", userId);
    expect(result).toEqual(sampleDeal);
  });

  it("returns undefined when deal not found", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getDealById("nonexistent", userId);
    expect(result).toBeUndefined();
  });

  it("returns first deal when multiple matches", async () => {
    const deals = [sampleDeal, { ...sampleDeal, id: "deal-2" }];
    mocks.selectWhere.mockResolvedValue(deals);
    const result = await getDealById("550e8400-e29b-41d4-a716-446655440000", userId);
    expect(result).toEqual(sampleDeal);
  });

  it("passes userId for user scoping", async () => {
    mocks.selectWhere.mockResolvedValue([sampleDeal]);
    await getDealById("550e8400-e29b-41d4-a716-446655440000", userId);
    expect(mocks.selectWhere).toHaveBeenCalledWith(
      { and: [{ col: "id", val: "550e8400-e29b-41d4-a716-446655440000" }, { col: "user_id", val: userId }] }
    );
  });

  it("returns undefined when deal belongs to different user", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getDealById("550e8400-e29b-41d4-a716-446655440000", "other-user");
    expect(result).toBeUndefined();
  });
});

describe("createDeal", () => {
  it("creates and returns a deal", async () => {
    mocks.insertReturning.mockResolvedValue([sampleDeal]);
    const data = { userId: "user-1", sponsorId: "sponsor-1", title: "Sponsorship Deal" };
    const result = await createDeal(data);
    expect(result).toEqual(sampleDeal);
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalledWith(data);
  });

  it("returns undefined when insert returns empty", async () => {
    mocks.insertReturning.mockResolvedValue([]);
    const result = await createDeal({ userId: "user-1", sponsorId: "sponsor-1", title: "Test" });
    expect(result).toBeUndefined();
  });
});

describe("updateDeal", () => {
  it("updates and returns the deal", async () => {
    const updated = { ...sampleDeal, title: "Updated Title" };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updateDeal("deal-1", { title: "Updated Title" }, userId);
    expect(result).toEqual(updated);
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.updateSet).toHaveBeenCalledWith({ title: "Updated Title" });
  });

  it("returns undefined when deal not found", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    const result = await updateDeal("nonexistent", { title: "Test" }, userId);
    expect(result).toBeUndefined();
  });

  it("handles partial update with single field", async () => {
    const updated = { ...sampleDeal, status: "active" as const };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updateDeal("deal-1", { status: "active" }, userId);
    expect(result?.status).toBe("active");
  });

  it("handles updating multiple fields", async () => {
    const updated = { ...sampleDeal, title: "New", description: "New desc" };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updateDeal("deal-1", { title: "New", description: "New desc" }, userId);
    expect(result?.title).toBe("New");
    expect(result?.description).toBe("New desc");
  });

  it("scopes update to userId", async () => {
    const updated = { ...sampleDeal, title: "Updated" };
    mocks.updateReturning.mockResolvedValue([updated]);
    await updateDeal("deal-1", { title: "Updated" }, userId);
    expect(mocks.updateWhere).toHaveBeenCalledWith(
      { and: [{ col: "id", val: "deal-1" }, { col: "user_id", val: userId }] }
    );
  });
});

describe("deleteDeal", () => {
  it("deletes and returns the deal", async () => {
    mocks.deleteReturning.mockResolvedValue([sampleDeal]);
    const result = await deleteDeal("deal-1", userId);
    expect(result).toEqual(sampleDeal);
    expect(mocks.deleteFn).toHaveBeenCalled();
  });

  it("returns undefined when deal not found", async () => {
    mocks.deleteReturning.mockResolvedValue([]);
    const result = await deleteDeal("nonexistent", userId);
    expect(result).toBeUndefined();
  });

  it("returns the deleted deal data", async () => {
    mocks.deleteReturning.mockResolvedValue([sampleDeal]);
    const result = await deleteDeal(sampleDeal.id, userId);
    expect(result?.id).toBe(sampleDeal.id);
    expect(result?.title).toBe(sampleDeal.title);
  });

  it("scopes delete to userId", async () => {
    mocks.deleteReturning.mockResolvedValue([sampleDeal]);
    await deleteDeal("deal-1", userId);
    expect(mocks.deleteWhere).toHaveBeenCalledWith(
      { and: [{ col: "id", val: "deal-1" }, { col: "user_id", val: userId }] }
    );
  });
});
