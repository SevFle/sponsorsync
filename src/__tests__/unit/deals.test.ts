import { describe, it, expect } from "vitest";
import { calculateDealProgress, createDealSchema, updateDealSchema } from "@/domain/deals";

describe("calculateDealProgress", () => {
  it("returns 0 when there are no deliverables", () => {
    expect(calculateDealProgress(0, 0)).toBe(0);
  });

  it("calculates percentage correctly", () => {
    expect(calculateDealProgress(10, 5)).toBe(50);
  });

  it("returns 100 when all deliverables are completed", () => {
    expect(calculateDealProgress(4, 4)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(calculateDealProgress(3, 1)).toBe(33);
  });

  it("returns 0 when total deliverables but none completed", () => {
    expect(calculateDealProgress(5, 0)).toBe(0);
  });

  it("handles 1 of 3 (33%)", () => {
    expect(calculateDealProgress(3, 1)).toBe(33);
  });

  it("handles 2 of 3 (67%)", () => {
    expect(calculateDealProgress(3, 2)).toBe(67);
  });

  it("handles 1 of 1 (100%)", () => {
    expect(calculateDealProgress(1, 1)).toBe(100);
  });
});

describe("createDealSchema", () => {
  it("validates valid input with required fields", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "New Sponsor Deal",
    });
    expect(result.success).toBe(true);
  });

  it("validates with all optional fields", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Full Deal",
      description: "A sponsorship deal",
      totalValue: 10000,
      currency: "USD",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid sponsorId", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "not-a-uuid",
      title: "Deal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing sponsorId", () => {
    const result = createDealSchema.safeParse({
      title: "Deal",
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
      title: "x".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative totalValue", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Deal",
      totalValue: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero totalValue", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Deal",
      totalValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects currency with wrong length", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Deal",
      currency: "US",
    });
    expect(result.success).toBe(false);
  });

  it("accepts currency with exactly 3 characters", () => {
    const result = createDealSchema.safeParse({
      sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Deal",
      currency: "USD",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateDealSchema", () => {
  it("validates empty partial input", () => {
    const result = updateDealSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates partial title update", () => {
    const result = updateDealSchema.safeParse({ title: "Updated Title" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid title in partial update", () => {
    const result = updateDealSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sponsorId in partial update", () => {
    const result = updateDealSchema.safeParse({ sponsorId: "bad" });
    expect(result.success).toBe(false);
  });
});
