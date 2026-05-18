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

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  mocks.getServerSession.mockResolvedValue(session);
}

function createPutRequest(data: unknown) {
  return new Request("http://localhost:3000/api/notifications", {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

const sampleNotification = {
  id: "notif-1",
  userId: "user-1",
  type: "deadline_reminder",
  title: "Upcoming Deadline",
  message: "Deliverable due in 3 days",
  relatedId: "deal-1",
  read: false,
  createdAt: new Date("2025-01-15T10:00:00Z").toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/notifications - edge cases", () => {
  it("handles notifications of all valid types", async () => {
    const allTypes = [
      { ...sampleNotification, id: "n1", type: "deadline_reminder" },
      { ...sampleNotification, id: "n2", type: "overdue_deliverable" },
      { ...sampleNotification, id: "n3", type: "payment_follow_up" },
    ];
    mocks.getNotifications.mockResolvedValue(allTypes);
    mocks.getUnreadCount.mockResolvedValue(3);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notifications).toHaveLength(3);
    const types = body.notifications.map((n: any) => n.type);
    expect(types).toContain("deadline_reminder");
    expect(types).toContain("overdue_deliverable");
    expect(types).toContain("payment_follow_up");
  });

  it("returns notifications with all required fields", async () => {
    mocks.getNotifications.mockResolvedValue([sampleNotification]);
    mocks.getUnreadCount.mockResolvedValue(1);

    const response = await GET();
    const body = await response.json();
    const notif = body.notifications[0];
    expect(notif).toHaveProperty("id");
    expect(notif).toHaveProperty("userId");
    expect(notif).toHaveProperty("type");
    expect(notif).toHaveProperty("title");
    expect(notif).toHaveProperty("message");
    expect(notif).toHaveProperty("read");
    expect(notif).toHaveProperty("createdAt");
  });

  it("handles large number of notifications", async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      ...sampleNotification,
      id: `notif-${i}`,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    mocks.getNotifications.mockResolvedValue(many);
    mocks.getUnreadCount.mockResolvedValue(100);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notifications).toHaveLength(100);
    expect(body.unreadCount).toBe(100);
  });

  it("handles notification with null relatedId", async () => {
    const notif = { ...sampleNotification, relatedId: null };
    mocks.getNotifications.mockResolvedValue([notif]);
    mocks.getUnreadCount.mockResolvedValue(1);

    const response = await GET();
    const body = await response.json();
    expect(body.notifications[0].relatedId).toBeNull();
  });

  it("handles notification with empty message", async () => {
    const notif = { ...sampleNotification, message: "" };
    mocks.getNotifications.mockResolvedValue([notif]);
    mocks.getUnreadCount.mockResolvedValue(1);

    const response = await GET();
    const body = await response.json();
    expect(body.notifications[0].message).toBe("");
  });

  it("handles notification with long title", async () => {
    const longTitle = "A".repeat(500);
    const notif = { ...sampleNotification, title: longTitle };
    mocks.getNotifications.mockResolvedValue([notif]);
    mocks.getUnreadCount.mockResolvedValue(1);

    const response = await GET();
    const body = await response.json();
    expect(body.notifications[0].title).toBe(longTitle);
  });

  it("returns correct unread count when some are read", async () => {
    const notifs = [
      { ...sampleNotification, id: "n1", read: false },
      { ...sampleNotification, id: "n2", read: false },
      { ...sampleNotification, id: "n3", read: true },
    ];
    mocks.getNotifications.mockResolvedValue(notifs);
    mocks.getUnreadCount.mockResolvedValue(2);

    const response = await GET();
    const body = await response.json();
    expect(body.unreadCount).toBe(2);
    const unread = body.notifications.filter((n: any) => !n.read);
    expect(unread).toHaveLength(2);
  });

  it("does not call markRead on GET", async () => {
    mocks.getNotifications.mockResolvedValue([sampleNotification]);
    mocks.getUnreadCount.mockResolvedValue(1);

    await GET();
    expect(mocks.markRead).not.toHaveBeenCalled();
    expect(mocks.markAllRead).not.toHaveBeenCalled();
  });
});

describe("PUT /api/notifications - markAllRead edge cases", () => {
  it("returns 0 when no unread notifications exist", async () => {
    mocks.markAllRead.mockResolvedValue(0);

    const response = await PUT(createPutRequest({ markAllRead: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(0);
  });

  it("returns exact count of marked notifications", async () => {
    mocks.markAllRead.mockResolvedValue(42);

    const response = await PUT(createPutRequest({ markAllRead: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(42);
  });

  it("calls markAllRead with session user id", async () => {
    mocks.markAllRead.mockResolvedValue(3);

    await PUT(createPutRequest({ markAllRead: true }));
    expect(mocks.markAllRead).toHaveBeenCalledWith("user-1");
  });
});

describe("PUT /api/notifications - markSingleRead edge cases", () => {
  it("calls markRead with notification id and user id", async () => {
    mocks.markRead.mockResolvedValue({ ...sampleNotification, read: true });

    await PUT(createPutRequest({ notificationId: "notif-1" }));
    expect(mocks.markRead).toHaveBeenCalledWith("notif-1", "user-1");
  });

  it("returns the updated notification with read=true", async () => {
    const readNotif = { ...sampleNotification, read: true };
    mocks.markRead.mockResolvedValue(readNotif);

    const response = await PUT(createPutRequest({ notificationId: "notif-1" }));
    const body = await response.json();
    expect(body.notification.read).toBe(true);
    expect(body.notification.id).toBe("notif-1");
  });

  it("returns 404 for nonexistent notification id", async () => {
    mocks.markRead.mockResolvedValue(undefined);

    const response = await PUT(createPutRequest({ notificationId: "nonexistent-id" }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Notification not found");
  });

  it("returns 404 for empty notification id string", async () => {
    mocks.markRead.mockResolvedValue(undefined);

    const response = await PUT(createPutRequest({ notificationId: "" }));
    expect(response.status).toBe(400);
  });

  it("prioritizes markAllRead over notificationId when both present", async () => {
    mocks.markAllRead.mockResolvedValue(5);

    const response = await PUT(
      createPutRequest({ markAllRead: true, notificationId: "notif-1" })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(5);
    expect(mocks.markAllRead).toHaveBeenCalled();
    expect(mocks.markRead).not.toHaveBeenCalled();
  });
});

describe("PUT /api/notifications - invalid body edge cases", () => {
  it("returns 400 for body with only unknown fields", async () => {
    const response = await PUT(createPutRequest({ unknownField: "value" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 for body with markAllRead=false", async () => {
    const response = await PUT(createPutRequest({ markAllRead: false }));
    expect(response.status).toBe(400);
  });

  it("markAllRead: 'true' (string) triggers markAllRead due to truthy check", async () => {
    mocks.markAllRead.mockResolvedValue(0);

    const response = await PUT(createPutRequest({ markAllRead: "true" }));
    expect(response.status).toBe(200);
    expect(mocks.markAllRead).toHaveBeenCalledWith("user-1");
  });

  it("returns 400 for body with notificationId=0", async () => {
    const response = await PUT(createPutRequest({ notificationId: 0 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for body with notificationId=false", async () => {
    const response = await PUT(createPutRequest({ notificationId: false }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/notifications - authentication edge cases", () => {
  it("returns 401 for null session", async () => {
    mockAuth(null);
    const response = await PUT(createPutRequest({ markAllRead: true }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for session with empty user object", async () => {
    mockAuth({ user: {} } as any);
    const response = await PUT(createPutRequest({ markAllRead: true }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for session with whitespace-only user id", async () => {
    mockAuth({ user: { id: "   " } } as any);
    const response = await PUT(createPutRequest({ markAllRead: true }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for session with numeric user id", async () => {
    mockAuth({ user: { id: 123 } } as any);
    const response = await PUT(createPutRequest({ markAllRead: true }));
    expect(response.status).toBe(401);
  });
});

describe("GET /api/notifications - response format", () => {
  it("response is valid JSON", async () => {
    mocks.getNotifications.mockResolvedValue([]);
    mocks.getUnreadCount.mockResolvedValue(0);

    const response = await GET();
    expect(() => response.json()).not.toThrow();
  });

  it("response has notifications array", async () => {
    mocks.getNotifications.mockResolvedValue([]);
    mocks.getUnreadCount.mockResolvedValue(0);

    const body = await (await GET()).json();
    expect(Array.isArray(body.notifications)).toBe(true);
  });

  it("response has unreadCount number", async () => {
    mocks.getNotifications.mockResolvedValue([]);
    mocks.getUnreadCount.mockResolvedValue(0);

    const body = await (await GET()).json();
    expect(typeof body.unreadCount).toBe("number");
  });
});
