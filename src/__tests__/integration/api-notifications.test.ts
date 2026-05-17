import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/notifications/route";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  getNotificationsByUserId: mocks.getNotifications,
  getUnreadNotificationCount: mocks.getUnreadCount,
  markNotificationRead: mocks.markRead,
  markAllNotificationsRead: mocks.markAllRead,
}));

import { getServerSession } from "next-auth";

const EXISTING_NOTIFICATION_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const NONEXISTENT_UUID = "00000000-0000-0000-0000-000000000000";
const USER_ID = "user-1";

const mockSession = { user: { id: USER_ID, email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  mocks.getServerSession.mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns notifications and unread count", async () => {
    const notifications = [
      {
        id: "notif-1",
        userId: "user-1",
        type: "deadline_reminder",
        title: "Upcoming Deadline",
        message: "Due in 3 days",
        relatedId: "deal-1",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
    mocks.getNotifications.mockResolvedValue(notifications);
    mocks.getUnreadCount.mockResolvedValue(1);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notifications).toEqual(notifications);
    expect(body.unreadCount).toBe(1);
  });

  it("returns empty array when no notifications exist", async () => {
    mocks.getNotifications.mockResolvedValue([]);
    mocks.getUnreadCount.mockResolvedValue(0);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notifications).toEqual([]);
    expect(body.unreadCount).toBe(0);
  });

  it("returns JSON content type", async () => {
    mocks.getNotifications.mockResolvedValue([]);
    mocks.getUnreadCount.mockResolvedValue(0);

    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("calls queries with session user id", async () => {
    mocks.getNotifications.mockResolvedValue([]);
    mocks.getUnreadCount.mockResolvedValue(0);

    await GET();
    expect(mocks.getNotifications).toHaveBeenCalledWith("user-1");
    expect(mocks.getUnreadCount).toHaveBeenCalledWith("user-1");
  });

  it("handles session without user id as unauthenticated", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ notificationId: "notif-1" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it("marks a single notification as read", async () => {
    const readNotif = {
      id: EXISTING_NOTIFICATION_ID,
      userId: USER_ID,
      type: "deadline_reminder",
      title: "Test",
      message: "Test",
      relatedId: null,
      read: true,
      createdAt: new Date().toISOString(),
    };
    mocks.markRead.mockResolvedValue(readNotif);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ notificationId: EXISTING_NOTIFICATION_ID }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
    expect(mocks.markRead).toHaveBeenCalledWith(EXISTING_NOTIFICATION_ID, USER_ID);
  });

  it("returns 404 when notification not found", async () => {
    mocks.markRead.mockResolvedValue(undefined);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ notificationId: NONEXISTENT_UUID }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Notification not found");
  });

  it("marks all notifications as read", async () => {
    const seededNotifications = [
      { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", userId: USER_ID, type: "deadline_reminder", title: "Notif 1", message: "M1", relatedId: null, read: true, createdAt: new Date().toISOString() },
      { id: "b1eec99-9c0b-4ef8-bb6d-6bb9bd380a22", userId: USER_ID, type: "overdue_deliverable", title: "Notif 2", message: "M2", relatedId: null, read: true, createdAt: new Date().toISOString() },
      { id: "c2eec99-9c0b-4ef8-bb6d-6bb9bd380a33", userId: USER_ID, type: "payment_follow_up", title: "Notif 3", message: "M3", relatedId: null, read: true, createdAt: new Date().toISOString() },
    ];
    mocks.markAllRead.mockResolvedValue(seededNotifications.length);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ markAllRead: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(3);
    expect(mocks.markAllRead).toHaveBeenCalledWith(USER_ID);
  });

  it("returns 400 for invalid request body", async () => {
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request body");
  });
});
