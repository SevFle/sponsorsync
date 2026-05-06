import { db } from "..";
import { deliverables, deals } from "../schema";
import { eq, and } from "drizzle-orm";

export async function getDeliverablesByDealId(dealId: string) {
  return db.select().from(deliverables).where(eq(deliverables.dealId, dealId));
}

export async function getDeliverableById(id: string, userId: string) {
  const [deliverable] = await db
    .select({
      id: deliverables.id,
      dealId: deliverables.dealId,
      title: deliverables.title,
      description: deliverables.description,
      status: deliverables.status,
      dueDate: deliverables.dueDate,
      completedDate: deliverables.completedDate,
      verificationData: deliverables.verificationData,
      notes: deliverables.notes,
      createdAt: deliverables.createdAt,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .innerJoin(deals, eq(deliverables.dealId, deals.id))
    .where(and(eq(deliverables.id, id), eq(deals.userId, userId)));
  return deliverable;
}

export async function createDeliverable(data: typeof deliverables.$inferInsert) {
  const [deliverable] = await db.insert(deliverables).values(data).returning();
  return deliverable;
}

export async function updateDeliverable(id: string, data: Partial<typeof deliverables.$inferInsert>, userId: string) {
  const ownershipCheck = await db
    .select({ id: deliverables.id })
    .from(deliverables)
    .innerJoin(deals, eq(deliverables.dealId, deals.id))
    .where(and(eq(deliverables.id, id), eq(deals.userId, userId)));

  if (!ownershipCheck.length) return undefined;

  const [deliverable] = await db.update(deliverables).set(data).where(eq(deliverables.id, id)).returning();
  return deliverable;
}

export async function deleteDeliverable(id: string, userId: string) {
  const ownershipCheck = await db
    .select({ id: deliverables.id })
    .from(deliverables)
    .innerJoin(deals, eq(deliverables.dealId, deals.id))
    .where(and(eq(deliverables.id, id), eq(deals.userId, userId)));

  if (!ownershipCheck.length) return undefined;

  const [deliverable] = await db.delete(deliverables).where(eq(deliverables.id, id)).returning();
  return deliverable;
}
