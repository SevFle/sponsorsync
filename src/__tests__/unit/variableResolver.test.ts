import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  },
}));

import { resolveVariables, resolveVariablesWithDefaults } from "@/lib/templates/variableResolver";
import { db } from "@/lib/db";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

describe("resolveVariablesWithDefaults", () => {
  it("merges template variables with overrides", () => {
    const result = resolveVariablesWithDefaults(
      { sponsor_name: "Acme", deal_amount: "$500" },
      { sponsor_name: "Overridden" }
    );
    expect(result.sponsor_name).toBe("Overridden");
    expect(result.deal_amount).toBe("$500");
  });

  it("adds new variables from overrides", () => {
    const result = resolveVariablesWithDefaults(
      { sponsor_name: "Acme" },
      { extra_field: "value" }
    );
    expect(result.sponsor_name).toBe("Acme");
    expect(result.extra_field).toBe("value");
  });

  it("returns template variables when no overrides", () => {
    const result = resolveVariablesWithDefaults({ name: "Test" }, {});
    expect(result).toEqual({ name: "Test" });
  });

  it("overrides with empty string", () => {
    const result = resolveVariablesWithDefaults(
      { sponsor_name: "Acme" },
      { sponsor_name: "" }
    );
    expect(result.sponsor_name).toBe("");
  });
});

describe("resolveVariables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves user info", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "u1", name: "John Doe" }]);
    mockDb.limit.mockResolvedValue([]);

    const result = await resolveVariables({ userId: "u1" });
    expect(result.variables.creator_name).toBe("John Doe");
  });

  it("reports missing when user not found", async () => {
    mockDb.limit.mockResolvedValue([]);

    const result = await resolveVariables({ userId: "nonexistent" });
    expect(result.missing).toContain("creator_name");
  });

  it("resolves sponsor info when sponsorId provided", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "u1", name: "John" }]);
    mockDb.limit.mockResolvedValueOnce([{
      id: "s1", name: "Acme Corp", company: "Acme Inc", email: "acme@test.com",
    }]);
    mockDb.limit.mockResolvedValue([]);

    const result = await resolveVariables({ userId: "u1", sponsorId: "s1" });
    expect(result.variables.sponsor_name).toBe("Acme Corp");
    expect(result.variables.sponsor_company).toBe("Acme Inc");
    expect(result.variables.sponsor_email).toBe("acme@test.com");
  });

  it("resolves deal info when dealId provided", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "u1", name: "John" }]);
    mockDb.limit.mockResolvedValueOnce([{
      id: "d1", title: "Big Deal", totalValue: 50000, startDate: "2024-01-01", endDate: "2024-06-30",
    }]);
    mockDb.limit.mockResolvedValue([]);

    const result = await resolveVariables({ userId: "u1", dealId: "d1" });
    expect(result.variables.deal_title).toBe("Big Deal");
    expect(result.variables.deal_amount).toBe("$500");
  });

  it("handles null deal totalValue", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "u1", name: "John" }]);
    mockDb.limit.mockResolvedValueOnce([{
      id: "d1", title: "Deal", totalValue: null, startDate: null, endDate: null,
    }]);
    mockDb.limit.mockResolvedValue([]);

    const result = await resolveVariables({ userId: "u1", dealId: "d1" });
    expect(result.variables.deal_amount).toBe("");
    expect(result.variables.deal_start_date).toBe("");
  });

  it("resolves deliverable info when deliverableId provided", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "u1", name: "John" }]);
    mockDb.limit.mockResolvedValueOnce([{
      id: "del1", title: "Episode Ad Read", description: "Pre-roll ad", dueDate: "2024-03-15",
    }]);

    const result = await resolveVariables({ userId: "u1", deliverableId: "del1" });
    expect(result.variables.deliverable_title).toBe("Episode Ad Read");
    expect(result.variables.deliverable_description).toBe("Pre-roll ad");
    expect(result.variables.due_date).toBe("2024-03-15");
  });

  it("resolves all context together", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "u1", name: "John" }]);
    mockDb.limit.mockResolvedValueOnce([{
      id: "s1", name: "Acme", company: "Acme Inc", email: "a@b.com",
    }]);
    mockDb.limit.mockResolvedValueOnce([{
      id: "d1", title: "Deal", totalValue: 20000, startDate: "2024-01-01", endDate: "2024-12-31",
    }]);
    mockDb.limit.mockResolvedValueOnce([{
      id: "del1", title: "Ad Read", description: "Mid-roll", dueDate: "2024-06-01",
    }]);

    const result = await resolveVariables({
      userId: "u1",
      sponsorId: "s1",
      dealId: "d1",
      deliverableId: "del1",
    });

    expect(result.variables.creator_name).toBe("John");
    expect(result.variables.sponsor_name).toBe("Acme");
    expect(result.variables.deal_title).toBe("Deal");
    expect(result.variables.deliverable_title).toBe("Ad Read");
    expect(result.missing).toEqual([]);
  });
});
