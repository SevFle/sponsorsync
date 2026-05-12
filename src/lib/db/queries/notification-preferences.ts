import { db } from "..";
import { notificationPreferences } from "../schema";
import { eq } from "drizzle-orm";

export async function getNotificationPreferencesByUserId(userId: string) {
  const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
  return prefs;
}

export async function upsertNotificationPreferences(
  userId: string,
  data: Partial<Pick<typeof notificationPreferences.$inferInsert, "deadlineReminders" | "paymentReminders" | "deliverableUpdates" | "reminderDaysBefore">>
) {
  const existing = await getNotificationPreferencesByUserId(userId);

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
