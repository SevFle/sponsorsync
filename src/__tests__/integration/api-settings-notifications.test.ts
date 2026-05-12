import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/settings/notifications/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/settings", () => ({
  getNotificationPreferences: vi.fn(),
  upsertNotificationPreferences: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/db/queries/settings";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
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

  it("returns default notification preferences when none exist", async () => {
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual({
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    });
  });

  it("returns existing notification preferences", async () => {
    const mockPrefs = {
      id: "pref-1",
      userId: "user-1",
      deadlineReminders: false,
      paymentReminders: true,
      deliverableUpdates: false,
      reminderDaysBefore: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrefs);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications.deadlineReminders).toBe(false);
    expect(body.notifications.reminderDaysBefore).toBe(7);
  });

  it("returns 500 on database error", async () => {
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch notification preferences");
  });
});

describe("PUT /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ deadlineReminders: false }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: "invalid json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 for validation errors", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ reminderDaysBefore: 100 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("updates notification preferences successfully", async () => {
    const updatedPrefs = {
      id: "pref-1",
      userId: "user-1",
      deadlineReminders: false,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(updatedPrefs);

    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({
        deadlineReminders: false,
        reminderDaysBefore: 5,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications.deadlineReminders).toBe(false);
    expect(body.notifications.reminderDaysBefore).toBe(5);
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      deadlineReminders: false,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 5,
    });
  });

  it("returns 500 on database error", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ deadlineReminders: false }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to update notification preferences");
  });
});
