import { describe, it, expect } from "vitest";
import {
  calculateDealProgress,
  createDealSchema,
  updateDealSchema,
  isValidStatusTransition,
  updateDealStatusSchema,
  DEAL_PIPELINE_STATUSES,
  ALL_DEAL_STATUSES,
} from "@/domain/deals";

describe("calculateDealProgress", () => {
  it("returns 0 when totalDeliverables is 0", () => {
    expect(calculateDealProgress(0, 0)).toBe(0);
  });

  it("returns 0 when totalDeliverables is 0 and completedDeliverables > 0", () => {
    expect(calculateDealProgress(0, 5)).toBe(0);
  });

  it("returns 100 when all deliverables are completed", () => {
    expect(calculateDealProgress(10, 10)).toBe(100);
  });

  it("returns 50 when half are completed", () => {
    expect(calculateDealProgress(10, 5)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(calculateDealProgress(3, 1)).toBe(33);
    expect(calculateDealProgress(3, 2)).toBe(67);
  });

  it("returns 0 when none are completed", () => {
    expect(calculateDealProgress(10, 0)).toBe(0);
  });

  it("handles single deliverable completed", () => {
    expect(calculateDealProgress(1, 1)).toBe(100);
  });

  it("handles single deliverable not completed", () => {
    expect(calculateDealProgress(1, 0)).toBe(0);
  });

  it("handles large numbers", () => {
    expect(calculateDealProgress(1000, 333)).toBe(33);
  });

  it("rounds 33.33... correctly", () => {
    expect(calculateDealProgress(9, 3)).toBe(33);
  });

  it("rounds 66.66... correctly", () => {
    expect(calculateDealProgress(9, 6)).toBe(67);
  });

  it("returns 25 for 1 of 4", () => {
    expect(calculateDealProgress(4, 1)).toBe(25);
  });

  it("returns 75 for 3 of 4", () => {
    expect(calculateDealProgress(4, 3)).toBe(75);
  });
});

describe("createDealSchema", () => {
  const validInput = {
    sponsorId: "550e8400-e29b-41d4-a716-446655440000",
    title: "Q2 Sponsorship",
  };

  it("accepts valid input with required fields only", () => {
    const result = createDealSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Q2 Sponsorship",
      description: "Full Q2 podcast sponsorship",
      totalValue: 10000,
      currency: "USD",
      startDate: "2025-04-01",
      endDate: "2025-06-30",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sponsorId", () => {
    const result = createDealSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for sponsorId", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "not-a-uuid",
      title: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 255 characters", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts title of exactly 255 characters", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "a".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative totalValue", () => {
    const result = createDealSchema.safeParse({
      ...validInput,
      totalValue: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero totalValue", () => {
    const result = createDealSchema.safeParse({
      ...validInput,
      totalValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects float totalValue", () => {
    const result = createDealSchema.safeParse({
      ...validInput,
      totalValue: 100.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong-length currency", () => {
    const result = createDealSchema.safeParse({
      ...validInput,
      currency: "US",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date for startDate", () => {
    const result = createDealSchema.safeParse({
      ...validInput,
      startDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date for endDate", () => {
    const result = createDealSchema.safeParse({
      ...validInput,
      endDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateDealSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateDealSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with title only", () => {
    const result = updateDealSchema.safeParse({ title: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with sponsorId only", () => {
    const result = updateDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with totalValue only", () => {
    const result = updateDealSchema.safeParse({ totalValue: 5000 });
    expect(result.success).toBe(true);
  });

  it("accepts description as empty string", () => {
    const result = updateDealSchema.safeParse({ description: "" });
    expect(result.success).toBe(true);
  });

  it("accepts all fields at once", () => {
    const result = updateDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Updated Deal",
      description: "Updated description",
      totalValue: 15000,
      currency: "EUR",
      startDate: "2025-07-01",
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for sponsorId in update", () => {
    const result = updateDealSchema.safeParse({ sponsorId: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title in update", () => {
    const result = updateDealSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative totalValue in update", () => {
    const result = updateDealSchema.safeParse({ totalValue: -1 });
    expect(result.success).toBe(false);
  });
});

describe("deal status transitions - exhaustive validation", () => {
  const allStatuses = ALL_DEAL_STATUSES;

  const expectedTransitions: Record<string, string[]> = {
    draft: ["proposed", "cancelled"],
    proposed: ["active", "draft", "cancelled"],
    active: ["completed", "cancelled"],
    completed: ["active"],
    cancelled: ["draft"],
  };

  for (const from of allStatuses) {
    describe(`from "${from}"`, () => {
      for (const to of allStatuses) {
        const shouldPass = expectedTransitions[from]?.includes(to) ?? false;
        if (shouldPass) {
          it(`allows transition to "${to}"`, () => {
            expect(isValidStatusTransition(from, to)).toBe(true);
          });
        } else {
          it(`rejects transition to "${to}"`, () => {
            expect(isValidStatusTransition(from, to)).toBe(false);
          });
        }
      }
    });
  }
});

describe("DEAL_PIPELINE_STATUSES", () => {
  it("excludes cancelled", () => {
    expect(DEAL_PIPELINE_STATUSES).not.toContain("cancelled");
  });

  it("has exactly 4 statuses", () => {
    expect(DEAL_PIPELINE_STATUSES).toHaveLength(4);
  });
});

describe("ALL_DEAL_STATUSES", () => {
  it("includes cancelled", () => {
    expect(ALL_DEAL_STATUSES).toContain("cancelled");
  });

  it("has exactly 5 statuses", () => {
    expect(ALL_DEAL_STATUSES).toHaveLength(5);
  });
});
