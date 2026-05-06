import { db } from "..";
import { payments, deals } from "../schema";
import { eq, and } from "drizzle-orm";

export async function getPaymentsByDealId(dealId: string) {
  return db.select().from(payments).where(eq(payments.dealId, dealId));
}

export async function getPaymentById(id: string, userId: string) {
  const [payment] = await db
    .select({
      id: payments.id,
      dealId: payments.dealId,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      dueDate: payments.dueDate,
      paidDate: payments.paidDate,
      invoiceUrl: payments.invoiceUrl,
      notes: payments.notes,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
    })
    .from(payments)
    .innerJoin(deals, eq(payments.dealId, deals.id))
    .where(and(eq(payments.id, id), eq(deals.userId, userId)));
  return payment;
}

export async function createPayment(data: typeof payments.$inferInsert) {
  const [payment] = await db.insert(payments).values(data).returning();
  return payment;
}

export async function updatePayment(id: string, data: Partial<typeof payments.$inferInsert>, userId: string) {
  const ownershipCheck = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(deals, eq(payments.dealId, deals.id))
    .where(and(eq(payments.id, id), eq(deals.userId, userId)));

  if (!ownershipCheck.length) return undefined;

  const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
  return payment;
}

export async function deletePayment(id: string, userId: string) {
  const ownershipCheck = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(deals, eq(payments.dealId, deals.id))
    .where(and(eq(payments.id, id), eq(deals.userId, userId)));

  if (!ownershipCheck.length) return undefined;

  const [payment] = await db.delete(payments).where(eq(payments.id, id)).returning();
  return payment;
}
