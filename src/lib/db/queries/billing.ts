import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing" | "paused" | "free";

interface SubscriptionUpdateData {
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}

export async function getUserWithBilling(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      stripePriceId: users.stripePriceId,
      subscriptionStatus: users.subscriptionStatus,
      currentPeriodStart: users.currentPeriodStart,
      currentPeriodEnd: users.currentPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user;
}

export async function updateStripeCustomerId(userId: string, customerId: string) {
  const [user] = await db
    .update(users)
    .set({
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function updateSubscriptionStatus(
  userId: string,
  data: SubscriptionUpdateData
) {
  const updateFields: Record<string, unknown> = {
    subscriptionStatus: data.subscriptionStatus,
    updatedAt: new Date(),
  };
  if (data.stripeSubscriptionId !== undefined) updateFields.stripeSubscriptionId = data.stripeSubscriptionId;
  if (data.stripePriceId !== undefined) updateFields.stripePriceId = data.stripePriceId;
  if (data.currentPeriodStart !== undefined) updateFields.currentPeriodStart = data.currentPeriodStart;
  if (data.currentPeriodEnd !== undefined) updateFields.currentPeriodEnd = data.currentPeriodEnd;

  const [user] = await db
    .update(users)
    .set(updateFields as Partial<typeof users.$inferInsert>)
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function getUserByStripeCustomerId(customerId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      stripePriceId: users.stripePriceId,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));
  return user;
}

export async function getUserByStripeSubscriptionId(subscriptionId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      stripePriceId: users.stripePriceId,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.stripeSubscriptionId, subscriptionId));
  return user;
}
