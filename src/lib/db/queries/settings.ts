import { db } from "..";
import { notificationPreferences, users } from "../schema";
import { eq } from "drizzle-orm";

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
    const [updated] = await db
      .update(notificationPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId, ...data })
    .returning();
  return created;
}

export async function getUserProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user;
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; image?: string }
) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  return updated;
}
