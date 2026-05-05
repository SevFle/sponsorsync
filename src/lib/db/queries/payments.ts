import { db } from "..";
import { payments } from "../schema";
import { eq } from "drizzle-orm";

export async function getPaymentsByDealId(dealId: string) {
  return db.select().from(payments).where(eq(payments.dealId, dealId));
}

export async function getPaymentById(id: string) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, id));
  return payment;
}

export async function createPayment(data: typeof payments.$inferInsert) {
  const [payment] = await db.insert(payments).values(data).returning();
  return payment;
}

export async function updatePayment(id: string, data: Partial<typeof payments.$inferInsert>) {
  const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
  return payment;
}

export async function deletePayment(id: string) {
  const [payment] = await db.delete(payments).where(eq(payments.id, id)).returning();
  return payment;
}
