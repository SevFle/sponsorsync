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

const seedNotifications = [
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
  {
    id: "notif-2",
    userId: "user-1",
    type: "payment_follow_up",
    title: "Payment Due",
    message: "Invoice #123",
    relatedId: "deal-2",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "notif-3",
    userId: "user-1",
    type: "overdue_deliverable",
    title: "Overdue",
    message: "Past due",
    relatedId: "deal-3",
    read: false,
    createdAt: new Date().toISOString(),
  },
];

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
    mocks.getNotifications.mockResolvedValue(seedNotifications);
    mocks.getUnreadCount.mockResolvedValue(seedNotifications.length);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notifications).toEqual(seedNotifications);
    expect(body.unreadCount).toBe(seedNotifications.length);
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
      body: JSON.stringify({ notificationId: seedNotifications[0].id }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it("marks a single notification as read", async () => {
    const seedNotif = seedNotifications[0];
    const readNotif = { ...seedNotif, read: true };
    mocks.markRead.mockResolvedValue(readNotif);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ notificationId: seedNotif.id }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notification).toEqual(readNotif);
    expect(mocks.markRead).toHaveBeenCalledWith(seedNotif.id, "user-1");
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
    const markedCount = seedNotifications.length;
    mocks.markAllRead.mockResolvedValue(markedCount);

    const request = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ markAllRead: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(markedCount);
    expect(body.markedRead).toBeGreaterThan(0);
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
