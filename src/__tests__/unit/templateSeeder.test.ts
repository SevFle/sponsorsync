import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries/templates", () => ({
  getDefaultTemplates: vi.fn(),
  createTemplate: vi.fn(),
  getTemplatesByUserIdFiltered: vi.fn().mockResolvedValue([]),
  getTemplateById: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  getTemplatesByUserId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db", () => ({
  db: {
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  },
}));

import { seedDefaultTemplates, ensureDefaultTemplates, resetDefaultTemplates } from "@/lib/templates/templateSeeder";
import { getDefaultTemplates, createTemplate } from "@/lib/db/queries/templates";
import { db } from "@/lib/db";

describe("seedDefaultTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds all default templates when none exist", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createTemplate as ReturnType<typeof vi.fn>).mockImplementation((data) => data);

    const result = await seedDefaultTemplates("user-1");

    expect(result.created).toBe(5);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(createTemplate).toHaveBeenCalledTimes(5);
  });

  it("skips templates that already exist by category", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { category: "outreach" },
      { category: "payment" },
    ]);
    (createTemplate as ReturnType<typeof vi.fn>).mockImplementation((data) => data);

    const result = await seedDefaultTemplates("user-1");

    expect(result.created).toBe(3);
    expect(result.skipped).toBe(2);
    expect(createTemplate).toHaveBeenCalledTimes(3);
  });

  it("skips all templates when all categories already exist", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { category: "outreach" },
      { category: "deliverable" },
      { category: "payment" },
      { category: "renewal" },
    ]);
    (createTemplate as ReturnType<typeof vi.fn>).mockImplementation((data) => data);

    const result = await seedDefaultTemplates("user-1");

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(5);
  });

  it("handles individual template creation errors gracefully", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createTemplate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "1" })
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce({ id: "3" })
      .mockResolvedValueOnce({ id: "4" })
      .mockResolvedValueOnce({ id: "5" });

    const result = await seedDefaultTemplates("user-1");

    expect(result.created).toBe(4);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("DB error");
  });

  it("passes correct data to createTemplate", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createTemplate as ReturnType<typeof vi.fn>).mockImplementation((data) => data);

    await seedDefaultTemplates("user-123");

    const firstCall = (createTemplate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstCall.userId).toBe("user-123");
    expect(firstCall.isDefault).toBe(true);
    expect(firstCall.name).toBeDefined();
    expect(firstCall.body).toBeDefined();
    expect(firstCall.subject).toBeDefined();
    expect(firstCall.category).toBeDefined();
  });
});

describe("ensureDefaultTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when all defaults exist", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ category: `cat-${i}` }))
    );

    await ensureDefaultTemplates("user-1");

    expect(createTemplate).not.toHaveBeenCalled();
  });

  it("seeds templates when count is less than defaults", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { category: "outreach" },
    ]);
    (createTemplate as ReturnType<typeof vi.fn>).mockImplementation((data) => data);

    await ensureDefaultTemplates("user-1");

    expect(createTemplate).toHaveBeenCalled();
  });

  it("seeds when no templates exist", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createTemplate as ReturnType<typeof vi.fn>).mockImplementation((data) => data);

    await ensureDefaultTemplates("user-1");

    expect(createTemplate).toHaveBeenCalled();
  });
});

describe("resetDefaultTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes existing defaults and reseeds", async () => {
    (getDefaultTemplates as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (createTemplate as ReturnType<typeof vi.fn>).mockImplementation((data) => data);

    const result = await resetDefaultTemplates("user-1");

    expect(db.delete).toHaveBeenCalled();
    expect(result.created).toBe(5);
  });

  it("handles deletion errors", async () => {
    const mockDb = db as unknown as {
      delete: ReturnType<typeof vi.fn>;
      from: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
    };
    mockDb.where.mockRejectedValueOnce(new Error("Delete failed"));

    const result = await resetDefaultTemplates("user-1");

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Delete failed");
    expect(result.created).toBe(0);
  });
});
