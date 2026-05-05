import { db } from "..";
import { sponsors } from "../schema";
import { eq } from "drizzle-orm";

export async function getSponsorsByUserId(userId: string) {
  return db.select().from(sponsors).where(eq(sponsors.userId, userId));
}

export async function getSponsorById(id: string) {
  const [sponsor] = await db.select().from(sponsors).where(eq(sponsors.id, id));
  return sponsor;
}

export async function createSponsor(data: typeof sponsors.$inferInsert) {
  const [sponsor] = await db.insert(sponsors).values(data).returning();
  return sponsor;
}

export async function updateSponsor(id: string, data: Partial<typeof sponsors.$inferInsert>) {
  const [sponsor] = await db.update(sponsors).set(data).where(eq(sponsors.id, id)).returning();
  return sponsor;
}

export async function deleteSponsor(id: string) {
  const [sponsor] = await db.delete(sponsors).where(eq(sponsors.id, id)).returning();
  return sponsor;
}
