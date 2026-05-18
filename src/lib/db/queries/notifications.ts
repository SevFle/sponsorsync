import { db } from "..";
import { notifications } from "../schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export async function createNotification(data: {
  userId: string;
  type: "deadline_reminder" | "overdue_deliverable" | "payment_follow_up";
  title: string;
  message: string;
  relatedId?: string;
  notificationKey?: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.relatedId ?? null,
      notificationKey: data.notificationKey ?? null,
    })
    .returning();
  return notification;
}

export async function notificationKeyExists(key: string): Promise<boolean> {
  const results = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(eq(notifications.notificationKey, key))
    .limit(1);
  return results.length > 0;
}

export async function findNotificationByKey(key: string) {
  const [notification] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.notificationKey, key))
    .limit(1);
  return notification ?? null;
}

export async function getNotificationsByUserId(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function getUnreadNotificationCount(userId: string) {
  const results = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return results.length;
}

export async function markNotificationRead(id: string, userId: string) {
  const [notification] = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  const updated = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .returning();
  return updated.length;
}

export async function deleteNotificationsByUserId(userId: string) {
  const deleted = await db
    .delete(notifications)
    .where(eq(notifications.userId, userId))
    .returning();
  return deleted.length;
}
