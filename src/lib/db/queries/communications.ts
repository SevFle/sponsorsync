import { db } from "..";
import { communications } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export async function getCommunicationsByUserId(
  userId: string,
  options?: { sponsorId?: string; limit?: number; offset?: number }
) {
  const conditions = [eq(communications.userId, userId)];

  if (options?.sponsorId) {
    conditions.push(eq(communications.sponsorId, options.sponsorId));
  }

  const query = db
    .select()
    .from(communications)
    .where(and(...conditions))
    .orderBy(desc(communications.sentAt));

  if (options?.limit) {
    return query.limit(options.limit).offset(options?.offset ?? 0);
  }

  return query;
}

export async function getCommunicationById(id: string, userId: string) {
  const [comm] = await db
    .select()
    .from(communications)
    .where(and(eq(communications.id, id), eq(communications.userId, userId)));
  return comm;
}

export async function createCommunication(data: typeof communications.$inferInsert) {
  const [comm] = await db.insert(communications).values(data).returning();
  return comm;
}

export async function updateCommunicationStatus(
  id: string,
  status: "sent" | "delivered" | "failed" | "bounced"
) {
  const [comm] = await db
    .update(communications)
    .set({ status })
    .where(eq(communications.id, id))
    .returning();
  return comm;
}

export async function countCommunicationsBySponsorId(sponsorId: string, userId: string) {
  const result = await db
    .select({ count: communications.id })
    .from(communications)
    .where(and(eq(communications.sponsorId, sponsorId), eq(communications.userId, userId)));
  return result.length;
}
