import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/settings/notifications/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/settings", () => ({
  getNotificationPreferences: vi.fn(),
  upsertNotificationPreferences: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getNotificationPreferences, upsertNotificationPreferences } from "@/lib/db/queries/settings";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

const mockPreferences = {
  id: "np-1",
  userId: "user-1",
  deadlineReminders: true,
  paymentReminders: true,
  deliverableUpdates: true,
  reminderDaysBefore: 3,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(mockPreferences);
  (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(mockPreferences);
});

describe("GET /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns notification preferences", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences).toEqual(mockPreferences);
  });

  it("returns 404 when preferences not found", async () => {
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Notification preferences not found");
  });
});

describe("PATCH /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ deadlineReminders: false }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 422 for invalid input data", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ reminderDaysBefore: 100 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("updates notification preferences", async () => {
    const updatedPrefs = { ...mockPreferences, deadlineReminders: false };
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(updatedPrefs);

    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ deadlineReminders: false }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.deadlineReminders).toBe(false);
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", { deadlineReminders: false });
  });

  it("returns 500 when database query fails on update", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ deadlineReminders: false }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to update notification preferences");
  });
});
