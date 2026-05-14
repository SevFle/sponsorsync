import { describe, it, expect } from "vitest";
import {
  resolveDateRange,
  isInRange,
  formatMonthKey,
  formatDayKey,
  parseFlexibleDate,
} from "@/lib/analytics/dateRangeHelper";

describe("resolveDateRange", () => {
  it("resolves 7d preset", () => {
    const ref = new Date("2025-03-15");
    const range = resolveDateRange("7d", ref);

    expect(range.from).toEqual(new Date("2025-03-09"));
    expect(range.to).toEqual(ref);
  });

  it("resolves 30d preset", () => {
    const ref = new Date("2025-03-15");
    const range = resolveDateRange("30d", ref);

    expect(range.from).toEqual(new Date("2025-02-14"));
    expect(range.to).toEqual(ref);
  });

  it("resolves 90d preset", () => {
    const ref = new Date("2025-03-15");
    const range = resolveDateRange("90d", ref);

    expect(range.from).toEqual(new Date("2024-12-16"));
    expect(range.to).toEqual(ref);
  });

  it("resolves this_month preset", () => {
    const ref = new Date("2025-03-15");
    const range = resolveDateRange("this_month", ref);

    expect(range.from).toEqual(new Date("2025-03-01"));
    expect(range.to.getDate()).toBeGreaterThanOrEqual(28);
  });

  it("resolves last_month preset", () => {
    const ref = new Date("2025-03-15");
    const range = resolveDateRange("last_month", ref);

    expect(range.from).toEqual(new Date("2025-02-01"));
    expect(range.to.getFullYear()).toBe(2025);
    expect(range.to.getMonth()).toBe(1);
    expect(range.to.getDate()).toBe(28);
  });

  it("resolves this_year preset", () => {
    const ref = new Date("2025-06-15");
    const range = resolveDateRange("this_year", ref);

    expect(range.from).toEqual(new Date("2025-01-01"));
    expect(range.to.getFullYear()).toBe(2025);
    expect(range.to.getMonth()).toBe(11);
    expect(range.to.getDate()).toBe(31);
  });

  it("uses current date when referenceDate is omitted", () => {
    const range = resolveDateRange("7d");
    const diffMs = range.to.getTime() - range.from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    expect(diffDays).toBe(6);
  });
});

describe("isInRange", () => {
  const range = { from: new Date("2025-01-01"), to: new Date("2025-12-31") };

  it("returns true for date within range", () => {
    expect(isInRange("2025-06-15", range)).toBe(true);
  });

  it("returns true for boundary dates", () => {
    expect(isInRange("2025-01-01", range)).toBe(true);
    expect(isInRange("2025-12-31", range)).toBe(true);
  });

  it("returns false for date outside range", () => {
    expect(isInRange("2024-12-31", range)).toBe(false);
    expect(isInRange("2026-01-01", range)).toBe(false);
  });

  it("returns false for null or undefined", () => {
    expect(isInRange(null, range)).toBe(false);
    expect(isInRange(undefined, range)).toBe(false);
  });

  it("handles Date objects", () => {
    expect(isInRange(new Date("2025-06-15"), range)).toBe(true);
    expect(isInRange(new Date("2024-06-15"), range)).toBe(false);
  });
});

describe("formatMonthKey", () => {
  it("formats date as yyyy-MM", () => {
    expect(formatMonthKey(new Date("2025-03-15"))).toBe("2025-03");
    expect(formatMonthKey(new Date("2025-12-01"))).toBe("2025-12");
  });
});

describe("formatDayKey", () => {
  it("formats date as yyyy-MM-dd", () => {
    expect(formatDayKey(new Date("2025-03-15"))).toBe("2025-03-15");
  });
});

describe("parseFlexibleDate", () => {
  it("parses ISO string", () => {
    const result = parseFlexibleDate("2025-03-15");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2025);
  });

  it("returns Date as-is if valid", () => {
    const d = new Date("2025-03-15");
    expect(parseFlexibleDate(d)).toEqual(d);
  });

  it("returns null for null/undefined", () => {
    expect(parseFlexibleDate(null)).toBeNull();
    expect(parseFlexibleDate(undefined)).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(parseFlexibleDate(new Date("invalid"))).toBeNull();
  });
});
