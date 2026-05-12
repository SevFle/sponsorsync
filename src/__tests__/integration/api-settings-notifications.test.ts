import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/settings/notifications/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/notification-preferences", () => ({
  getNotificationPreferencesByUserId: vi.fn(),
  upsertNotificationPreferences: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getNotificationPreferencesByUserId, upsertNotificationPreferences } from "@/lib/db/queries/notification-preferences";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

function createRequest(data: unknown) {
  return new Request("http://localhost:3000/api/settings/notifications", {
    method: "PATCH",
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

  it("returns notification preferences", async () => {
    (getNotificationPreferencesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual({
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    });
  });

  it("returns 404 when no preferences exist", async () => {
    (getNotificationPreferencesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Notification preferences not found");
  });
});

describe("PATCH /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await PATCH(createRequest({ deadlineReminders: false }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON", async () => {
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

  it("returns 422 for invalid data", async () => {
    const response = await PATCH(createRequest({ reminderDaysBefore: 100 }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates notification preferences", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: false,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 7,
    });

    const response = await PATCH(createRequest({ deadlineReminders: false, reminderDaysBefore: 7 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications.deadlineReminders).toBe(false);
    expect(body.notifications.reminderDaysBefore).toBe(7);
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      deadlineReminders: false,
      reminderDaysBefore: 7,
    });
  });

  it("accepts partial updates", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: false,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    });

    const response = await PATCH(createRequest({ deadlineReminders: false }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications.deadlineReminders).toBe(false);
  });

  it("rejects non-boolean deadlineReminders", async () => {
    const response = await PATCH(createRequest({ deadlineReminders: "yes" }));
    expect(response.status).toBe(422);
  });

  it("rejects reminderDaysBefore below 1", async () => {
    const response = await PATCH(createRequest({ reminderDaysBefore: 0 }));
    expect(response.status).toBe(422);
  });

  it("rejects reminderDaysBefore above 30", async () => {
    const response = await PATCH(createRequest({ reminderDaysBefore: 31 }));
    expect(response.status).toBe(422);
  });

  it("accepts valid reminderDaysBefore boundary values", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 1,
    });

    const response = await PATCH(createRequest({ reminderDaysBefore: 1 }));
    expect(response.status).toBe(200);
  });
});
