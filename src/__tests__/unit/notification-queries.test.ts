import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const selectOrderBy = vi.fn();
  const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const updateReturning = vi.fn();
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const insertReturning = vi.fn();
  const insertValues = vi.fn(() => ({ returning: insertReturning }));
  const insert = vi.fn(() => ({ values: insertValues }));

  return {
    select, selectFrom, selectWhere, selectOrderBy,
    insert, insertValues, insertReturning,
    update, updateSet, updateWhere, updateReturning,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  notifications: {
    id: "id",
    userId: "user_id",
    type: "type",
    title: "title",
    message: "message",
    relatedId: "related_id",
    read: "read",
    createdAt: "created_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => col),
}));

import {
  createNotification,
  getNotificationsByUserId,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/db/queries/notifications";

const sampleNotification = {
  id: "notif-1",
  userId: "user-1",
  type: "deadline_reminder" as const,
  title: "Upcoming Deadline",
  message: "Deliverable due in 3 days",
  relatedId: "deal-1",
  read: false,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createNotification", () => {
  it("creates and returns a notification", async () => {
    mocks.insertReturning.mockResolvedValue([sampleNotification]);
    const data = {
      userId: "user-1",
      type: "deadline_reminder" as const,
      title: "Upcoming Deadline",
      message: "Deliverable due in 3 days",
      relatedId: "deal-1",
    };
    const result = await createNotification(data);
    expect(result).toEqual(sampleNotification);
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "deadline_reminder",
        title: "Upcoming Deadline",
        message: "Deliverable due in 3 days",
        relatedId: "deal-1",
      })
    );
  });

  it("handles notification without relatedId", async () => {
    const notifWithoutRelated = { ...sampleNotification, relatedId: null };
    mocks.insertReturning.mockResolvedValue([notifWithoutRelated]);
    const result = await createNotification({
      userId: "user-1",
      type: "overdue_deliverable" as const,
      title: "Overdue",
      message: "Past due",
    });
    expect(result).toEqual(notifWithoutRelated);
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ relatedId: null })
    );
  });

  it("returns undefined when insert returns empty", async () => {
    mocks.insertReturning.mockResolvedValue([]);
    const result = await createNotification({
      userId: "user-1",
      type: "deadline_reminder" as const,
      title: "Test",
      message: "Test",
    });
    expect(result).toBeUndefined();
  });
});

describe("getNotificationsByUserId", () => {
  it("returns notifications for a user ordered by date", async () => {
    mocks.selectOrderBy.mockResolvedValue([sampleNotification]);
    const result = await getNotificationsByUserId("user-1");
    expect(result).toEqual([sampleNotification]);
    expect(mocks.select).toHaveBeenCalled();
    expect(mocks.selectOrderBy).toHaveBeenCalled();
  });

  it("returns empty array when user has no notifications", async () => {
    mocks.selectOrderBy.mockResolvedValue([]);
    const result = await getNotificationsByUserId("user-1");
    expect(result).toEqual([]);
  });

  it("returns multiple notifications", async () => {
    const notifs = [
      sampleNotification,
      { ...sampleNotification, id: "notif-2", type: "payment_follow_up" as const },
    ];
    mocks.selectOrderBy.mockResolvedValue(notifs);
    const result = await getNotificationsByUserId("user-1");
    expect(result).toHaveLength(2);
  });
});

describe("getUnreadNotificationCount", () => {
  it("returns count of unread notifications", async () => {
    (mocks.selectWhere as any).mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    const result = await getUnreadNotificationCount("user-1");
    expect(result).toBe(2);
  });

  it("returns 0 when all notifications are read", async () => {
    (mocks.selectWhere as any).mockResolvedValue([]);
    const result = await getUnreadNotificationCount("user-1");
    expect(result).toBe(0);
  });
});

describe("markNotificationRead", () => {
  it("marks a notification as read", async () => {
    const readNotif = { ...sampleNotification, read: true };
    mocks.updateReturning.mockResolvedValue([readNotif]);
    const result = await markNotificationRead("notif-1", "user-1");
    expect(result).toEqual(readNotif);
    expect(mocks.updateSet).toHaveBeenCalledWith({ read: true });
  });

  it("returns undefined when notification not found", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    const result = await markNotificationRead("nonexistent", "user-1");
    expect(result).toBeUndefined();
  });
});

describe("markAllNotificationsRead", () => {
  it("marks all notifications as read and returns count", async () => {
    mocks.updateReturning.mockResolvedValue([
      { ...sampleNotification, read: true },
      { ...sampleNotification, id: "notif-2", read: true },
    ]);
    const result = await markAllNotificationsRead("user-1");
    expect(result).toBe(2);
    expect(mocks.updateSet).toHaveBeenCalledWith({ read: true });
  });

  it("returns 0 when no unread notifications exist", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    const result = await markAllNotificationsRead("user-1");
    expect(result).toBe(0);
  });
});
