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

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };
const mockPrefs = {
  id: "pref-1",
  userId: "user-1",
  deadlineReminders: true,
  paymentReminders: true,
  deliverableUpdates: true,
  reminderDaysBefore: 3,
};

function mockAuth(session: typeof mockSession | null) {
  mocks.getServerSession.mockResolvedValue(session);
}

function makePutRequest(data: unknown) {
  return new Request("http://localhost:3000/api/settings/notifications", {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns preferences when they exist", async () => {
    mocks.getPreferences.mockResolvedValue(mockPrefs);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences).toEqual(mockPrefs);
  });

  it("returns null preferences when none exist", async () => {
    mocks.getPreferences.mockResolvedValue(null);
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

  it("calls getNotificationPreferences with session user id", async () => {
    mocks.getPreferences.mockResolvedValue(mockPrefs);
    await GET();
    expect(mocks.getPreferences).toHaveBeenCalledWith("user-1");
  });

  it("handles session without user id as unauthenticated", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("handles session with empty string user id as unauthenticated", async () => {
    mockAuth({ user: { id: "" } } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("handles session with whitespace-only user id as unauthenticated", async () => {
    mockAuth({ user: { id: "   " } } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("handles session with non-string user id as unauthenticated", async () => {
    mockAuth({ user: { id: 123 } } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await PUT(makePutRequest({ deadlineReminders: false }));
    expect(response.status).toBe(401);
  });

  it("updates deadlineReminders and returns updated preferences", async () => {
    const updated = { ...mockPrefs, deadlineReminders: false };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ deadlineReminders: false }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(false);
  });

  it("updates paymentReminders and returns updated preferences", async () => {
    const updated = { ...mockPrefs, paymentReminders: false };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ paymentReminders: false }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.paymentReminders).toBe(false);
  });

  it("updates reminderDaysBefore within valid range", async () => {
    const updated = { ...mockPrefs, reminderDaysBefore: 7 };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ reminderDaysBefore: 7 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderDaysBefore).toBe(7);
  });

  it("updates deliverableUpdates", async () => {
    const updated = { ...mockPrefs, deliverableUpdates: false };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ deliverableUpdates: false }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.deliverableUpdates).toBe(false);
  });

  it("updates multiple preferences at once", async () => {
    const updated = {
      ...mockPrefs,
      deadlineReminders: false,
      paymentReminders: false,
      reminderDaysBefore: 14,
    };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(
      makePutRequest({
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
  });

  it("calls upsertNotificationPreferences with user id and parsed data", async () => {
    mocks.upsertPreferences.mockResolvedValue(mockPrefs);
    await PUT(makePutRequest({ deadlineReminders: false }));
    expect(mocks.upsertPreferences).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ deadlineReminders: false })
    );
  });
});

describe("PUT /api/settings/notifications - reminderSchedule validation", () => {
  it("accepts valid reminderSchedule", async () => {
    const updated = { ...mockPrefs, reminderSchedule: [7, 3, 1] };
    mocks.validateSchedule.mockReturnValue({ valid: true, schedule: [7, 3, 1] });
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ reminderSchedule: [7, 3, 1] }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderSchedule).toEqual([7, 3, 1]);
  });

  it("accepts single-tier schedule", async () => {
    const updated = { ...mockPrefs, reminderSchedule: [3] };
    mocks.validateSchedule.mockReturnValue({ valid: true, schedule: [3] });
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ reminderSchedule: [3] }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderSchedule).toEqual([3]);
  });

  it("accepts five-tier schedule (max)", async () => {
    const updated = { ...mockPrefs, reminderSchedule: [14, 7, 5, 3, 1] };
    mocks.validateSchedule.mockReturnValue({ valid: true, schedule: [14, 7, 5, 3, 1] });
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ reminderSchedule: [14, 7, 5, 3, 1] }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderSchedule).toHaveLength(5);
  });

  it("returns 400 for empty reminderSchedule", async () => {
    const response = await PUT(makePutRequest({ reminderSchedule: [] }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Validation failed");
  });

  it("returns 400 for reminderSchedule exceeding 5 tiers", async () => {
    const response = await PUT(makePutRequest({ reminderSchedule: [30, 21, 14, 7, 3, 1] }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Validation failed");
  });

  it("returns 400 for reminderSchedule with value below 1", async () => {
    const response = await PUT(makePutRequest({ reminderSchedule: [7, 0] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for reminderSchedule with value above 30", async () => {
    const response = await PUT(makePutRequest({ reminderSchedule: [31] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for reminderDaysBelow below minimum", async () => {
    const response = await PUT(makePutRequest({ reminderDaysBefore: 0 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for reminderDaysBefore above maximum", async () => {
    const response = await PUT(makePutRequest({ reminderDaysBefore: 31 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for reminderDaysBefore as decimal", async () => {
    const response = await PUT(makePutRequest({ reminderDaysBefore: 3.5 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-boolean deadlineReminders", async () => {
    const response = await PUT(makePutRequest({ deadlineReminders: "yes" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-integer reminderDaysBefore", async () => {
    const response = await PUT(makePutRequest({ reminderDaysBefore: "three" }));
    expect(response.status).toBe(400);
  });

  it("returns validation details in error response", async () => {
    const response = await PUT(makePutRequest({ reminderSchedule: [] }));
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("details");
    expect(Array.isArray(body.details)).toBe(true);
  });

  it("uses sorted schedule from validateReminderSchedule", async () => {
    mocks.validateSchedule.mockReturnValue({ valid: true, schedule: [7, 3, 1] });
    mocks.upsertPreferences.mockResolvedValue({ ...mockPrefs, reminderSchedule: [7, 3, 1] });
    await PUT(makePutRequest({ reminderSchedule: [1, 7, 3] }));
    expect(mocks.upsertPreferences).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ reminderSchedule: [7, 3, 1] })
    );
  });

  it("returns JSON content type on success", async () => {
    mocks.upsertPreferences.mockResolvedValue(mockPrefs);
    const response = await PUT(makePutRequest({ deadlineReminders: true }));
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns JSON content type on validation error", async () => {
    const response = await PUT(makePutRequest({ reminderSchedule: [] }));
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("PUT /api/settings/notifications - edge cases", () => {
  it("handles empty body object", async () => {
    mocks.upsertPreferences.mockResolvedValue(mockPrefs);
    const response = await PUT(makePutRequest({}));
    expect(response.status).toBe(200);
  });

  it("handles unknown fields by ignoring them", async () => {
    mocks.upsertPreferences.mockResolvedValue(mockPrefs);
    const response = await PUT(makePutRequest({ unknownField: "value", deadlineReminders: true }));
    expect(response.status).toBe(200);
  });

  it("accepts minimum valid reminderDaysBefore (1)", async () => {
    const updated = { ...mockPrefs, reminderDaysBefore: 1 };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ reminderDaysBefore: 1 }));
    expect(response.status).toBe(200);
  });

  it("accepts maximum valid reminderDaysBefore (30)", async () => {
    const updated = { ...mockPrefs, reminderDaysBefore: 30 };
    mocks.upsertPreferences.mockResolvedValue(updated);
    const response = await PUT(makePutRequest({ reminderDaysBefore: 30 }));
    expect(response.status).toBe(200);
  });
});
