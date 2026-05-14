import { db } from "..";
import { sponsorContacts } from "../schema";
import { eq, and } from "drizzle-orm";

export async function getContactsBySponsorId(sponsorId: string) {
  return db
    .select()
    .from(sponsorContacts)
    .where(eq(sponsorContacts.sponsorId, sponsorId))
    .orderBy(sponsorContacts.isPrimary, sponsorContacts.name);
}

export async function getContactById(id: string, sponsorId: string) {
  const [contact] = await db
    .select()
    .from(sponsorContacts)
    .where(and(eq(sponsorContacts.id, id), eq(sponsorContacts.sponsorId, sponsorId)));
  return contact;
}

export async function createContact(data: typeof sponsorContacts.$inferInsert) {
  const [contact] = await db.insert(sponsorContacts).values(data).returning();
  return contact;
}

export async function updateContact(
  id: string,
  data: Partial<typeof sponsorContacts.$inferInsert>,
  sponsorId: string
) {
  const [contact] = await db
    .update(sponsorContacts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(sponsorContacts.id, id), eq(sponsorContacts.sponsorId, sponsorId)))
    .returning();
  return contact;
}

export async function deleteContact(id: string, sponsorId: string) {
  const [contact] = await db
    .delete(sponsorContacts)
    .where(and(eq(sponsorContacts.id, id), eq(sponsorContacts.sponsorId, sponsorId)))
    .returning();
  return contact;
}

export async function getPrimaryContact(sponsorId: string) {
  const [contact] = await db
    .select()
    .from(sponsorContacts)
    .where(and(eq(sponsorContacts.sponsorId, sponsorId), eq(sponsorContacts.isPrimary, true)))
    .limit(1);
  return contact;
}

export async function clearPrimaryFlag(sponsorId: string) {
  await db
    .update(sponsorContacts)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(sponsorContacts.sponsorId, sponsorId), eq(sponsorContacts.isPrimary, true)));
}
