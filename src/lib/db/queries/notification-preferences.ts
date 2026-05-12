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
  data: Partial<typeof notificationPreferences.$inferInsert>
) {
  const [prefs] = await db
    .update(notificationPreferences)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId))
    .returning();
  return prefs;
}
