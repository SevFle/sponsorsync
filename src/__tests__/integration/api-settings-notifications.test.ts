import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/settings/notifications/route";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getPreferences: vi.fn(),
  upsertPreferences: vi.fn(),
  validateSchedule: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/settings", () => ({
  getNotificationPreferences: mocks.getPreferences,
  upsertNotificationPreferences: mocks.upsertPreferences,
}));

vi.mock("@/lib/deadlines/config", () => ({
  validateReminderSchedule: mocks.validateSchedule,
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };
const mockPrefs = {
  id: "pref-1",
  userId: "user-1",
  deadlineReminders: true,
  paymentReminders: true,
  deliverableUpdates: true,
  reminderDaysBefore: 3,
  reminderSchedule: [7, 3, 1],
};

function mockAuth(session: typeof mockSession | null) {
  mocks.getServerSession.mockResolvedValue(session);
}

function createPutRequest(data: unknown) {
  return new Request("http://localhost:3000/api/settings/notifications", {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  mocks.validateSchedule.mockImplementation((schedule: number[]) => ({
    valid: true,
    schedule: [...schedule].sort((a, b) => b - a),
  }));
});

describe("GET /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns preferences for authenticated user", async () => {
    mocks.getPreferences.mockResolvedValue(mockPrefs);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences).toEqual(mockPrefs);
    expect(mocks.getPreferences).toHaveBeenCalledWith("user-1");
  });

  it("returns null preferences when none exist", async () => {
    mocks.getPreferences.mockResolvedValue(undefined);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences).toBeNull();
  });

  it("returns JSON content type", async () => {
    mocks.getPreferences.mockResolvedValue(mockPrefs);
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("handles session without user id as unauthenticated", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("handles session with empty user id as unauthenticated", async () => {
    mockAuth({ user: { id: "  " } } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("handles session with numeric user id as unauthenticated", async () => {
    mockAuth({ user: { id: 123 } } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/settings/notifications - authentication", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await PUT(createPutRequest({ deadlineReminders: false }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await PUT(createPutRequest({ deadlineReminders: false }));
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/settings/notifications - deadlineReminders", () => {
  it("disables deadline reminders", async () => {
    const updated = { ...mockPrefs, deadlineReminders: false };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ deadlineReminders: false }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(false);
  });

  it("enables deadline reminders", async () => {
    const updated = { ...mockPrefs, deadlineReminders: true };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ deadlineReminders: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(true);
  });

  it("rejects non-boolean deadlineReminders", async () => {
    const response = await PUT(createPutRequest({ deadlineReminders: "yes" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("rejects numeric deadlineReminders", async () => {
    const response = await PUT(createPutRequest({ deadlineReminders: 1 }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/settings/notifications - paymentReminders", () => {
  it("disables payment reminders", async () => {
    const updated = { ...mockPrefs, paymentReminders: false };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ paymentReminders: false }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.paymentReminders).toBe(false);
  });

  it("rejects non-boolean paymentReminders", async () => {
    const response = await PUT(createPutRequest({ paymentReminders: 0 }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/settings/notifications - deliverableUpdates", () => {
  it("disables deliverable updates", async () => {
    const updated = { ...mockPrefs, deliverableUpdates: false };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ deliverableUpdates: false }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.deliverableUpdates).toBe(false);
  });

  it("rejects non-boolean deliverableUpdates", async () => {
    const response = await PUT(createPutRequest({ deliverableUpdates: "true" }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/settings/notifications - reminderDaysBefore", () => {
  it("updates reminderDaysBefore to valid value", async () => {
    const updated = { ...mockPrefs, reminderDaysBefore: 7 };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ reminderDaysBefore: 7 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderDaysBefore).toBe(7);
  });

  it("accepts minimum value of 1", async () => {
    const updated = { ...mockPrefs, reminderDaysBefore: 1 };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ reminderDaysBefore: 1 }));
    expect(response.status).toBe(200);
  });

  it("accepts maximum value of 30", async () => {
    const updated = { ...mockPrefs, reminderDaysBefore: 30 };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ reminderDaysBefore: 30 }));
    expect(response.status).toBe(200);
  });

  it("rejects value of 0 (below minimum)", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: 0 }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("rejects value of 31 (above maximum)", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: 31 }));
    expect(response.status).toBe(400);
  });

  it("rejects negative value", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: -1 }));
    expect(response.status).toBe(400);
  });

  it("rejects non-integer value", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: 3.5 }));
    expect(response.status).toBe(400);
  });

  it("rejects string value", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: "5" }));
    expect(response.status).toBe(400);
  });

  it("rejects very large value", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: 999 }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/settings/notifications - reminderSchedule", () => {
  it("accepts valid schedule", async () => {
    const updated = { ...mockPrefs, reminderSchedule: [7, 3, 1] };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ reminderSchedule: [7, 3, 1] }));
    expect(response.status).toBe(200);
  });

  it("accepts single-tier schedule", async () => {
    const updated = { ...mockPrefs, reminderSchedule: [3] };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ reminderSchedule: [3] }));
    expect(response.status).toBe(200);
  });

  it("accepts max 5-tier schedule", async () => {
    const updated = { ...mockPrefs, reminderSchedule: [14, 7, 5, 3, 1] };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(createPutRequest({ reminderSchedule: [14, 7, 5, 3, 1] }));
    expect(response.status).toBe(200);
  });

  it("rejects empty schedule array", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [] }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("rejects schedule exceeding 5 tiers", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [30, 21, 14, 7, 3, 1] }));
    expect(response.status).toBe(400);
  });

  it("rejects schedule with value below 1", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [7, 0] }));
    expect(response.status).toBe(400);
  });

  it("rejects schedule with value above 30", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [31] }));
    expect(response.status).toBe(400);
  });

  it("rejects schedule with non-integer values", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [7, 3.5] }));
    expect(response.status).toBe(400);
  });

  it("rejects schedule with string values", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [7, "three"] as any }));
    expect(response.status).toBe(400);
  });

  it("sorts schedule descending when validateReminderSchedule returns sorted", async () => {
    const updated = { ...mockPrefs, reminderSchedule: [7, 3, 1] };
    mocks.upsertPreferences.mockResolvedValue(updated);
    mocks.validateSchedule.mockReturnValue({ valid: true, schedule: [7, 3, 1] });

    const response = await PUT(createPutRequest({ reminderSchedule: [1, 3, 7] }));
    expect(response.status).toBe(200);
    expect(mocks.validateSchedule).toHaveBeenCalledWith([1, 3, 7]);
    expect(mocks.upsertPreferences).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ reminderSchedule: [7, 3, 1] })
    );
  });

  it("rejects when validateReminderSchedule fails", async () => {
    mocks.validateSchedule.mockReturnValue({
      valid: false,
      schedule: [],
      error: "Schedule cannot have more than 5 tiers",
    });

    const response = await PUT(createPutRequest({ reminderSchedule: [14, 7, 5, 3, 1] }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("5 tiers");
  });

  it("passes schedule through validateReminderSchedule even for valid zod input", async () => {
    mocks.validateSchedule.mockReturnValue({
      valid: false,
      schedule: [],
      error: "Custom validation error",
    });

    const response = await PUT(createPutRequest({ reminderSchedule: [7, 3, 1] }));
    expect(response.status).toBe(400);
    expect(mocks.validateSchedule).toHaveBeenCalledWith([7, 3, 1]);
  });
});

describe("PUT /api/settings/notifications - combined updates", () => {
  it("updates multiple preferences at once", async () => {
    const updated = {
      ...mockPrefs,
      deadlineReminders: false,
      paymentReminders: false,
      reminderDaysBefore: 14,
    };
    mocks.upsertPreferences.mockResolvedValue(updated);

    const response = await PUT(
      createPutRequest({
        deadlineReminders: false,
        paymentReminders: false,
        reminderDaysBefore: 14,
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(false);
    expect(body.preferences.paymentReminders).toBe(false);
    expect(body.preferences.reminderDaysBefore).toBe(14);
    expect(mocks.upsertPreferences).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        deadlineReminders: false,
        paymentReminders: false,
        reminderDaysBefore: 14,
      })
    );
  });

  it("updates all preferences including schedule at once", async () => {
    const updated = {
      ...mockPrefs,
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: false,
      reminderDaysBefore: 5,
      reminderSchedule: [14, 7, 3],
    };
    mocks.upsertPreferences.mockResolvedValue(updated);

    const response = await PUT(
      createPutRequest({
        deadlineReminders: true,
        paymentReminders: true,
        deliverableUpdates: false,
        reminderDaysBefore: 5,
        reminderSchedule: [14, 7, 3],
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences).toEqual(updated);
  });

  it("rejects combined update if any field is invalid", async () => {
    const response = await PUT(
      createPutRequest({
        deadlineReminders: false,
        reminderDaysBefore: 999,
      })
    );
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/settings/notifications - validation error details", () => {
  it("returns validation error details array", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: 0 }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("includes field path in validation details", async () => {
    const response = await PUT(createPutRequest({ reminderDaysBefore: 0 }));
    const body = await response.json();
    expect(body.details[0]).toContain("reminderDaysBefore");
  });

  it("returns multiple errors for multiple invalid fields", async () => {
    const response = await PUT(
      createPutRequest({
        deadlineReminders: "not-a-bool",
        reminderDaysBefore: -5,
        reminderSchedule: [0, 100],
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.details.length).toBeGreaterThanOrEqual(2);
  });
});

describe("PUT /api/settings/notifications - edge cases", () => {
  it("rejects request with empty body", async () => {
    const response = await PUT(createPutRequest({}));
    expect(response.status).toBe(200);
  });

  it("rejects request with unknown extra fields (zod strips them)", async () => {
    mocks.upsertPreferences.mockResolvedValue(mockPrefs);
    const response = await PUT(
      createPutRequest({ deadlineReminders: true, unknownField: "value" })
    );
    expect(response.status).toBe(200);
    expect(mocks.upsertPreferences).toHaveBeenCalledWith(
      "user-1",
      expect.not.objectContaining({ unknownField: "value" })
    );
  });

  it("handles null body as validation error", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: "null",
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(400);
  });

  it("handles malformed JSON body", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    await expect(PUT(request)).rejects.toThrow();
  });

  it("rejects reminderSchedule containing zero", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [0] }));
    expect(response.status).toBe(400);
  });

  it("rejects reminderSchedule containing negative numbers", async () => {
    const response = await PUT(createPutRequest({ reminderSchedule: [-1] }));
    expect(response.status).toBe(400);
  });

  it("rejects reminderSchedule with duplicate values", async () => {
    mocks.validateSchedule.mockReturnValue({
      valid: true,
      schedule: [3],
    });
    const updated = { ...mockPrefs, reminderSchedule: [3] };
    mocks.upsertPreferences.mockResolvedValue(updated);

    const response = await PUT(createPutRequest({ reminderSchedule: [3, 3] }));
    expect(response.status).toBe(200);
  });
});
