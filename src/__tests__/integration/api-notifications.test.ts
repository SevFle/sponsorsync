import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, POST } from "@/app/api/notifications/route";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  createNotif: vi.fn(),
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
  createNotification: mocks.createNotif,
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

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
      id: "notif-1",
      userId: "user-1",
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
      body: JSON.stringify({ notificationId: "notif-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notification).toEqual(readNotif);
    expect(mocks.markRead).toHaveBeenCalledWith("notif-1", "user-1");
  });

  it("returns 404 when notification not found", async () => {
    mocks.markRead.mockResolvedValue(undefined);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ notificationId: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Notification not found");
  });

  it("marks all notifications as read", async () => {
    mocks.markAllRead.mockResolvedValue(3);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ markAllRead: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(3);
    expect(mocks.markAllRead).toHaveBeenCalledWith("user-1");
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

describe("POST /api/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({ type: "deadline_reminder", title: "T", message: "M" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("creates a notification and returns 201", async () => {
    const created = {
      id: "notif-new",
      userId: "user-1",
      type: "deadline_reminder",
      title: "Test",
      message: "Test message",
      relatedId: null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    mocks.createNotif.mockResolvedValue(created);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({ type: "deadline_reminder", title: "Test", message: "Test message" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.notification).toEqual(created);
    expect(mocks.createNotif).toHaveBeenCalledWith({
      userId: "user-1",
      type: "deadline_reminder",
      title: "Test",
      message: "Test message",
      relatedId: undefined,
    });
  });

  it("returns 400 when type is missing", async () => {
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({ title: "Test", message: "Test message" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 when title is missing", async () => {
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({ type: "deadline_reminder", message: "Test message" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when message is missing", async () => {
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({ type: "deadline_reminder", title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid notification type", async () => {
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({ type: "invalid_type", title: "Test", message: "Test message" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid notification type");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("creates notification with relatedId when provided", async () => {
    const created = {
      id: "notif-rel",
      userId: "user-1",
      type: "deadline_reminder",
      title: "Test",
      message: "Test",
      relatedId: "deal-123",
      read: false,
      createdAt: new Date().toISOString(),
    };
    mocks.createNotif.mockResolvedValue(created);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({
        type: "deadline_reminder",
        title: "Test",
        message: "Test",
        relatedId: "deal-123",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.createNotif).toHaveBeenCalledWith(
      expect.objectContaining({ relatedId: "deal-123" })
    );
  });

  it("accepts all valid notification types", async () => {
    const types = ["deadline_reminder", "overdue_deliverable", "payment_follow_up"];
    mocks.createNotif.mockResolvedValue({
      id: "notif-type",
      userId: "user-1",
      type: "deadline_reminder",
      title: "T",
      message: "M",
      read: false,
      createdAt: new Date().toISOString(),
    });

    for (const type of types) {
      const request = new Request("http://localhost:3000/api/notifications", {
        method: "POST",
        body: JSON.stringify({ type, title: "T", message: "M" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    }

    expect(mocks.createNotif).toHaveBeenCalledTimes(types.length);
  });
});
