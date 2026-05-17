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

function mockUserFound(name: string | null) {
  mockDb.limit.mockResolvedValueOnce([{ id: "u1", name }]);
}

function mockNothingFound() {
  mockDb.limit.mockResolvedValue([]);
}

describe("resolveVariables - user edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles user with null name", async () => {
    mockUserFound(null);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1" });
    expect(result.variables.creator_name).toBe("");
    expect(result.variables.creator_show).toBe("");
    expect(result.missing).toEqual([]);
  });

  it("handles user with empty string name", async () => {
    mockUserFound("");
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1" });
    expect(result.variables.creator_name).toBe("");
  });
});

describe("resolveVariables - sponsor edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles sponsor with null company and email", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "s1", name: "Acme Corp", company: null, email: null,
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", sponsorId: "s1" });
    expect(result.variables.sponsor_name).toBe("Acme Corp");
    expect(result.variables.sponsor_company).toBe("");
    expect(result.variables.sponsor_email).toBe("");
  });

  it("reports missing when sponsor not found", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", sponsorId: "s-missing" });
    expect(result.missing).toContain("sponsor_name");
    expect(result.variables.sponsor_name).toBeUndefined();
  });

  it("does not resolve sponsor when no sponsorId provided", async () => {
    mockUserFound("John");
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1" });
    expect(result.variables.sponsor_name).toBeUndefined();
    expect(result.variables.sponsor_company).toBeUndefined();
  });
});

describe("resolveVariables - deal edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats deal amount from cents", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "d1", title: "Big Deal", totalValue: 100000, startDate: "2024-01-01", endDate: "2024-12-31",
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", dealId: "d1" });
    expect(result.variables.deal_amount).toBe("$1000");
  });

  it("handles zero deal amount", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "d1", title: "Free Deal", totalValue: 0, startDate: "2024-01-01", endDate: "2024-12-31",
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", dealId: "d1" });
    expect(result.variables.deal_amount).toBe("$0");
  });

  it("reports missing when deal not found", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", dealId: "d-missing" });
    expect(result.missing).toContain("deal_title");
  });

  it("handles deal with all null date fields", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "d1", title: "No Dates", totalValue: null, startDate: null, endDate: null,
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", dealId: "d1" });
    expect(result.variables.deal_start_date).toBe("");
    expect(result.variables.deal_end_date).toBe("");
    expect(result.variables.deal_amount).toBe("");
  });
});

describe("resolveVariables - deliverable edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles deliverable with null description and dueDate", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "del1", title: "Ad Read", description: null, dueDate: null,
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", deliverableId: "del1" });
    expect(result.variables.deliverable_title).toBe("Ad Read");
    expect(result.variables.deliverable_description).toBe("");
    expect(result.variables.due_date).toBe("");
  });

  it("reports missing when deliverable not found", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", deliverableId: "del-missing" });
    expect(result.missing).toContain("deliverable_title");
  });
});

describe("resolveVariables - payment edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates invoice number from payment id prefix", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "p1abc234", amount: 5000, dueDate: "2024-06-15",
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", paymentId: "p1abc234" });
    expect(result.variables.invoice_number).toBe("INV-P1ABC234");
  });

  it("formats payment amount from cents", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "p1", amount: 25000, dueDate: "2024-06-15",
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", paymentId: "p1" });
    expect(result.variables.invoice_amount).toBe("$250");
  });

  it("handles zero payment amount", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([{
      id: "p1", amount: 0, dueDate: null,
    }]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", paymentId: "p1" });
    expect(result.variables.invoice_amount).toBe("$0");
  });

  it("reports multiple missing fields when payment not found", async () => {
    mockUserFound("John");
    mockDb.limit.mockResolvedValueOnce([]);
    mockNothingFound();

    const result = await resolveVariables({ userId: "u1", paymentId: "p-missing" });
    expect(result.missing).toContain("invoice_amount");
    expect(result.missing).toContain("invoice_number");
    expect(result.missing).toContain("payment_due_date");
    expect(result.missing).toHaveLength(3);
  });
});

describe("resolveVariables - minimal context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only resolves user when only userId provided", async () => {
    mockUserFound("Solo User");

    const result = await resolveVariables({ userId: "u1" });
    expect(result.variables.creator_name).toBe("Solo User");
    expect(result.variables.creator_show).toBe("");
    expect(Object.keys(result.variables)).toEqual(["creator_name", "creator_show"]);
    expect(result.missing).toEqual([]);
  });
});

describe("resolveVariablesWithDefaults - edge cases", () => {
  it("returns empty when both are empty", () => {
    const result = resolveVariablesWithDefaults({}, {});
    expect(result).toEqual({});
  });

  it("preserves all template variables when overrides is empty", () => {
    const template = { a: "1", b: "2", c: "3" };
    const result = resolveVariablesWithDefaults(template, {});
    expect(result).toEqual(template);
  });

  it("override takes precedence for every key", () => {
    const result = resolveVariablesWithDefaults(
      { a: "old", b: "old", c: "old" },
      { a: "new", b: "new", c: "new" }
    );
    expect(result).toEqual({ a: "new", b: "new", c: "new" });
  });

  it("handles numeric-like string values", () => {
    const result = resolveVariablesWithDefaults(
      { amount: "0" },
      { amount: "100" }
    );
    expect(result.amount).toBe("100");
  });

  it("does not mutate template variables object", () => {
    const template = { sponsor_name: "Original" };
    const copy = { ...template };
    resolveVariablesWithDefaults(template, { sponsor_name: "Override" });
    expect(template).toEqual(copy);
  });
});
