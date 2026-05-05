import { db } from "..";
import { deliverables } from "../schema";
import { eq } from "drizzle-orm";

export async function getDeliverablesByDealId(dealId: string) {
  return db.select().from(deliverables).where(eq(deliverables.dealId, dealId));
}

export async function getDeliverableById(id: string) {
  const [deliverable] = await db.select().from(deliverables).where(eq(deliverables.id, id));
  return deliverable;
}

export async function createDeliverable(data: typeof deliverables.$inferInsert) {
  const [deliverable] = await db.insert(deliverables).values(data).returning();
  return deliverable;
}

export async function updateDeliverable(id: string, data: Partial<typeof deliverables.$inferInsert>) {
  const [deliverable] = await db.update(deliverables).set(data).where(eq(deliverables.id, id)).returning();
  return deliverable;
}

export async function deleteDeliverable(id: string) {
  const [deliverable] = await db.delete(deliverables).where(eq(deliverables.id, id)).returning();
  return deliverable;
}
