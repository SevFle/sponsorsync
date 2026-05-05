import { db } from "..";
import { deals } from "../schema";
import { eq } from "drizzle-orm";

export async function getDealsByUserId(userId: string) {
  return db.select().from(deals).where(eq(deals.userId, userId));
}

export async function getDealById(id: string) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  return deal;
}

export async function createDeal(data: typeof deals.$inferInsert) {
  const [deal] = await db.insert(deals).values(data).returning();
  return deal;
}

export async function updateDeal(id: string, data: Partial<typeof deals.$inferInsert>) {
  const [deal] = await db.update(deals).set(data).where(eq(deals.id, id)).returning();
  return deal;
}

export async function deleteDeal(id: string) {
  const [deal] = await db.delete(deals).where(eq(deals.id, id)).returning();
  return deal;
}
