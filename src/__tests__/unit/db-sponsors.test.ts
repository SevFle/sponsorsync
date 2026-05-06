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
  sponsors: {
    id: "id",
    userId: "user_id",
    name: "name",
    company: "company",
    email: "email",
    phone: "phone",
    notes: "notes",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import {
  getSponsorsByUserId,
  getSponsorById,
  createSponsor,
  updateSponsor,
  deleteSponsor,
} from "@/lib/db/queries/sponsors";

const sampleSponsor = {
  id: "sponsor-1",
  userId: "user-1",
  name: "Acme Corp",
  company: "Acme Inc",
  email: "contact@acme.com",
  phone: "+1234567890",
  notes: "Premium sponsor",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSponsorsByUserId", () => {
  it("returns sponsors for a given user id", async () => {
    mocks.selectWhere.mockResolvedValue([sampleSponsor]);
    const result = await getSponsorsByUserId("user-1");
    expect(result).toEqual([sampleSponsor]);
    expect(mocks.select).toHaveBeenCalled();
  });

  it("returns empty array when user has no sponsors", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getSponsorsByUserId("no-sponsors-user");
    expect(result).toEqual([]);
  });

  it("returns multiple sponsors for a user", async () => {
    const sponsors = [
      sampleSponsor,
      { ...sampleSponsor, id: "sponsor-2", name: "Beta LLC" },
    ];
    mocks.selectWhere.mockResolvedValue(sponsors);
    const result = await getSponsorsByUserId("user-1");
    expect(result).toHaveLength(2);
  });
});

describe("getSponsorById", () => {
  it("returns sponsor when found", async () => {
    mocks.selectWhere.mockResolvedValue([sampleSponsor]);
    const result = await getSponsorById("sponsor-1");
    expect(result).toEqual(sampleSponsor);
  });

  it("returns undefined when not found", async () => {
    mocks.selectWhere.mockResolvedValue([]);
    const result = await getSponsorById("nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("createSponsor", () => {
  it("creates and returns a sponsor", async () => {
    mocks.insertReturning.mockResolvedValue([sampleSponsor]);
    const data = { userId: "user-1", name: "Acme Corp" };
    const result = await createSponsor(data);
    expect(result).toEqual(sampleSponsor);
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalledWith(data);
  });

  it("returns undefined when insert returns empty", async () => {
    mocks.insertReturning.mockResolvedValue([]);
    const result = await createSponsor({ userId: "user-1", name: "Test" });
    expect(result).toBeUndefined();
  });

  it("creates sponsor with all optional fields", async () => {
    const fullSponsor = { ...sampleSponsor, company: "Full Corp", phone: "+111" };
    mocks.insertReturning.mockResolvedValue([fullSponsor]);
    const data = {
      userId: "user-1",
      name: "Full Corp",
      company: "Full Corp",
      email: "full@corp.com",
      phone: "+111",
    };
    const result = await createSponsor(data);
    expect(result?.company).toBe("Full Corp");
    expect(result?.phone).toBe("+111");
  });
});

describe("updateSponsor", () => {
  it("updates and returns the sponsor", async () => {
    const updated = { ...sampleSponsor, name: "Updated Corp" };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updateSponsor("sponsor-1", { name: "Updated Corp" });
    expect(result).toEqual(updated);
    expect(mocks.updateSet).toHaveBeenCalledWith({ name: "Updated Corp" });
  });

  it("returns undefined when sponsor not found", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    const result = await updateSponsor("nonexistent", { name: "X" });
    expect(result).toBeUndefined();
  });

  it("handles updating email field", async () => {
    const updated = { ...sampleSponsor, email: "new@acme.com" };
    mocks.updateReturning.mockResolvedValue([updated]);
    const result = await updateSponsor("sponsor-1", { email: "new@acme.com" });
    expect(result?.email).toBe("new@acme.com");
  });
});

describe("deleteSponsor", () => {
  it("deletes and returns the sponsor", async () => {
    mocks.deleteReturning.mockResolvedValue([sampleSponsor]);
    const result = await deleteSponsor("sponsor-1");
    expect(result).toEqual(sampleSponsor);
    expect(mocks.deleteFn).toHaveBeenCalled();
  });

  it("returns undefined when sponsor not found", async () => {
    mocks.deleteReturning.mockResolvedValue([]);
    const result = await deleteSponsor("nonexistent");
    expect(result).toBeUndefined();
  });
});
