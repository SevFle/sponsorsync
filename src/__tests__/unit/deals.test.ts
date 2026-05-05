import { describe, it, expect } from "vitest";
import { calculateDealProgress } from "@/domain/deals";

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
});
