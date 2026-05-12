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
}));

import { getServerSession } from "next-auth";
import { getNotificationPreferences, upsertNotificationPreferences } from "@/lib/db/queries/settings";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/settings/notifications - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET();
    expect(getNotificationPreferences).not.toHaveBeenCalled();
  });
});

describe("GET /api/settings/notifications - data fetching", () => {
  it("returns existing notification preferences", async () => {
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 7,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.deadlineReminders).toBe(true);
    expect(body.preferences.paymentReminders).toBe(false);
    expect(body.preferences.reminderDaysBefore).toBe(7);
    expect(getNotificationPreferences).toHaveBeenCalledWith("user-1");
  });

  it("returns defaults when no preferences exist", async () => {
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences).toEqual({
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    });
  });
});

describe("PUT /api/settings/notifications - updates", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ deadlineReminders: false }),
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it("updates notification preferences", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: false,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 5,
    });

    const request = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({
        deadlineReminders: false,
        reminderDaysBefore: 5,
      }),
    });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.deadlineReminders).toBe(false);
    expect(body.preferences.reminderDaysBefore).toBe(5);
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      deadlineReminders: false,
      paymentReminders: undefined,
      deliverableUpdates: undefined,
      reminderDaysBefore: 5,
    });
  });

  it("updates all notification fields at once", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: false,
      paymentReminders: false,
      deliverableUpdates: false,
      reminderDaysBefore: 1,
    });

    const request = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({
        deadlineReminders: false,
        paymentReminders: false,
        deliverableUpdates: false,
        reminderDaysBefore: 1,
      }),
    });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.deadlineReminders).toBe(false);
    expect(body.preferences.paymentReminders).toBe(false);
    expect(body.preferences.deliverableUpdates).toBe(false);
    expect(body.preferences.reminderDaysBefore).toBe(1);
  });

  it("returns 401 on PUT when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const request = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ deadlineReminders: false }),
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });
});
