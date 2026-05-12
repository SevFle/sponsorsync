import { db } from "..";
import { users, notificationPreferences } from "../schema";
import { eq } from "drizzle-orm";

export async function getUserProfile(userId: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, userId));
  return user;
}

export async function updateUserProfile(userId: string, data: { name?: string; email?: string; image?: string }) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, name: users.name, image: users.image });
  return user;
}

export async function getNotificationPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  return prefs;
}

export async function upsertNotificationPreferences(
  userId: string,
  data: {
    deadlineReminders?: boolean;
    paymentReminders?: boolean;
    deliverableUpdates?: boolean;
    reminderDaysBefore?: number;
  }
) {
  const existing = await getNotificationPreferences(userId);
  if (existing) {
    const [prefs] = await db
      .update(notificationPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return prefs;
  }
  const [prefs] = await db
    .insert(notificationPreferences)
    .values({ userId, ...data })
    .returning();
  return prefs;
}

export async function getUserSettings(userId: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  return user;
}
