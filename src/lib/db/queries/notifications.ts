import { db } from "..";
import { notificationPreferences } from "../schema";
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
    .values({
      userId,
      deadlineReminders: data.deadlineReminders ?? true,
      paymentReminders: data.paymentReminders ?? true,
      deliverableUpdates: data.deliverableUpdates ?? true,
      reminderDaysBefore: data.reminderDaysBefore ?? 3,
    })
    .returning();
  return created;
}
