import { describe, it, expect } from "vitest";
import {
  DEFAULT_REMINDER_SCHEDULE,
  validateReminderSchedule,
  resolveReminderSchedule,
  MAX_REMINDER_TIERS,
  MIN_REMINDER_DAYS,
  MAX_REMINDER_DAYS,
} from "@/lib/deadlines/config";

describe("DEFAULT_REMINDER_SCHEDULE", () => {
  it("contains 7, 3, 1", () => {
    expect(DEFAULT_REMINDER_SCHEDULE).toEqual([7, 3, 1]);
  });
});

describe("validateReminderSchedule", () => {
  it("accepts valid schedule", () => {
    const result = validateReminderSchedule([7, 3, 1]);
    expect(result.valid).toBe(true);
    expect(result.schedule).toEqual([7, 3, 1]);
  });

  it("accepts single tier", () => {
    const result = validateReminderSchedule([3]);
    expect(result.valid).toBe(true);
    expect(result.schedule).toEqual([3]);
  });

  it("accepts unsorted schedule and sorts descending", () => {
    const result = validateReminderSchedule([1, 7, 3]);
    expect(result.valid).toBe(true);
    expect(result.schedule).toEqual([7, 3, 1]);
  });

  it("rejects non-array", () => {
    const result = validateReminderSchedule("not an array");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("array");
  });

  it("rejects empty array", () => {
    const result = validateReminderSchedule([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects too many tiers", () => {
    const result = validateReminderSchedule([1, 2, 3, 4, 5, 6]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_REMINDER_TIERS}`);
  });

  it("rejects non-numeric values", () => {
    const result = validateReminderSchedule([7, "three" as any, 1]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("numbers");
  });

  it(`rejects value below ${MIN_REMINDER_DAYS}`, () => {
    const result = validateReminderSchedule([0]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MIN_REMINDER_DAYS}`);
  });

  it(`rejects value above ${MAX_REMINDER_DAYS}`, () => {
    const result = validateReminderSchedule([31]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_REMINDER_DAYS}`);
  });

  it("accepts boundary values", () => {
    const result = validateReminderSchedule([1, 30]);
    expect(result.valid).toBe(true);
    expect(result.schedule).toEqual([30, 1]);
  });
});

describe("resolveReminderSchedule", () => {
  it("returns user schedule sorted descending when provided", () => {
    const result = resolveReminderSchedule([3, 7]);
    expect(result).toEqual([7, 3]);
  });

  it("returns default when user schedule is null", () => {
    const result = resolveReminderSchedule(null);
    expect(result).toEqual([7, 3, 1]);
  });

  it("returns default when user schedule is undefined", () => {
    const result = resolveReminderSchedule(undefined);
    expect(result).toEqual([7, 3, 1]);
  });

  it("returns default when user schedule is empty", () => {
    const result = resolveReminderSchedule([]);
    expect(result).toEqual([7, 3, 1]);
  });
});
