import { describe, it, expect } from "vitest";
import { z } from "zod";

const notificationPreferencesSchema = z.object({
  deadlineReminders: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  deliverableUpdates: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(1).max(30).optional(),
  reminderSchedule: z
    .array(z.number().int().min(1).max(30))
    .min(1)
    .max(5)
    .optional(),
});

describe("notificationPreferencesSchema - deadlineReminders", () => {
  it("accepts true", () => {
    const result = notificationPreferencesSchema.safeParse({ deadlineReminders: true });
    expect(result.success).toBe(true);
  });

  it("accepts false", () => {
    const result = notificationPreferencesSchema.safeParse({ deadlineReminders: false });
    expect(result.success).toBe(true);
  });

  it("rejects string 'true'", () => {
    const result = notificationPreferencesSchema.safeParse({ deadlineReminders: "true" });
    expect(result.success).toBe(false);
  });

  it("rejects number 1", () => {
    const result = notificationPreferencesSchema.safeParse({ deadlineReminders: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const result = notificationPreferencesSchema.safeParse({ deadlineReminders: null });
    expect(result.success).toBe(false);
  });

  it("accepts omission (optional)", () => {
    const result = notificationPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("notificationPreferencesSchema - paymentReminders", () => {
  it("accepts boolean", () => {
    expect(
      notificationPreferencesSchema.safeParse({ paymentReminders: true }).success
    ).toBe(true);
    expect(
      notificationPreferencesSchema.safeParse({ paymentReminders: false }).success
    ).toBe(true);
  });

  it("rejects non-boolean", () => {
    expect(
      notificationPreferencesSchema.safeParse({ paymentReminders: "yes" }).success
    ).toBe(false);
    expect(
      notificationPreferencesSchema.safeParse({ paymentReminders: 0 }).success
    ).toBe(false);
  });
});

describe("notificationPreferencesSchema - deliverableUpdates", () => {
  it("accepts boolean", () => {
    expect(
      notificationPreferencesSchema.safeParse({ deliverableUpdates: true }).success
    ).toBe(true);
  });

  it("rejects non-boolean", () => {
    expect(
      notificationPreferencesSchema.safeParse({ deliverableUpdates: 1 }).success
    ).toBe(false);
  });
});

describe("notificationPreferencesSchema - reminderDaysBefore", () => {
  it("accepts valid integer within range", () => {
    for (const val of [1, 3, 7, 14, 30]) {
      const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: val });
      expect(result.success).toBe(true);
    }
  });

  it("rejects 0 (below minimum)", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects 31 (above maximum)", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: 31 });
    expect(result.success).toBe(false);
  });

  it("rejects negative values", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects float values", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: 3.5 });
    expect(result.success).toBe(false);
  });

  it("rejects string", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: "5" });
    expect(result.success).toBe(false);
  });

  it("rejects Infinity", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: Infinity });
    expect(result.success).toBe(false);
  });

  it("rejects NaN", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderDaysBefore: NaN });
    expect(result.success).toBe(false);
  });

  it("accepts omission (optional)", () => {
    const result = notificationPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("notificationPreferencesSchema - reminderSchedule", () => {
  it("accepts valid array of integers", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [7, 3, 1] });
    expect(result.success).toBe(true);
  });

  it("accepts single-element array", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [3] });
    expect(result.success).toBe(true);
  });

  it("accepts 5-element array (max)", () => {
    const result = notificationPreferencesSchema.safeParse({
      reminderSchedule: [14, 7, 5, 3, 1],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [] });
    expect(result.success).toBe(false);
  });

  it("rejects array with 6 elements (exceeds max)", () => {
    const result = notificationPreferencesSchema.safeParse({
      reminderSchedule: [30, 21, 14, 7, 3, 1],
    });
    expect(result.success).toBe(false);
  });

  it("rejects array containing 0", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [7, 0] });
    expect(result.success).toBe(false);
  });

  it("rejects array containing negative", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [-1] });
    expect(result.success).toBe(false);
  });

  it("rejects array containing value above 30", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [31] });
    expect(result.success).toBe(false);
  });

  it("rejects array containing float", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [3.5] });
    expect(result.success).toBe(false);
  });

  it("rejects array containing strings", () => {
    const result = notificationPreferencesSchema.safeParse({
      reminderSchedule: ["three"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: "1,3,7" });
    expect(result.success).toBe(false);
  });

  it("rejects array containing NaN", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [NaN] });
    expect(result.success).toBe(false);
  });

  it("accepts array with duplicate values", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [3, 3] });
    expect(result.success).toBe(true);
  });

  it("accepts boundary value 1", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [1] });
    expect(result.success).toBe(true);
  });

  it("accepts boundary value 30", () => {
    const result = notificationPreferencesSchema.safeParse({ reminderSchedule: [30] });
    expect(result.success).toBe(true);
  });
});

describe("notificationPreferencesSchema - combined fields", () => {
  it("accepts all fields together", () => {
    const result = notificationPreferencesSchema.safeParse({
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 7,
      reminderSchedule: [14, 7, 3],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        deadlineReminders: true,
        paymentReminders: false,
        deliverableUpdates: true,
        reminderDaysBefore: 7,
        reminderSchedule: [14, 7, 3],
      });
    }
  });

  it("strips unknown fields", () => {
    const result = notificationPreferencesSchema.safeParse({
      deadlineReminders: true,
      unknownField: "should be stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).unknownField).toBeUndefined();
    }
  });

  it("accepts empty object", () => {
    const result = notificationPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("reports multiple errors for multiple invalid fields", () => {
    const result = notificationPreferencesSchema.safeParse({
      deadlineReminders: "not-a-bool",
      reminderDaysBefore: -5,
      reminderSchedule: [0, 100],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});
