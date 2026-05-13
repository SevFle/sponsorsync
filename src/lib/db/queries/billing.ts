import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

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
  data: {
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    subscriptionStatus: "active" | "past_due" | "canceled" | "trialing" | "paused" | "free";
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  }
) {
  const cleanedData: Record<string, unknown> = {
    subscriptionStatus: data.subscriptionStatus,
    updatedAt: new Date(),
  };
  if (data.stripeSubscriptionId !== undefined) cleanedData.stripeSubscriptionId = data.stripeSubscriptionId;
  if (data.stripePriceId !== undefined) cleanedData.stripePriceId = data.stripePriceId;
  if (data.currentPeriodStart !== undefined) cleanedData.currentPeriodStart = data.currentPeriodStart;
  if (data.currentPeriodEnd !== undefined) cleanedData.currentPeriodEnd = data.currentPeriodEnd;

  const [user] = await db
    .update(users)
    .set(cleanedData)
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
