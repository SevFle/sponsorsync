import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getUserWithBilling } from "@/lib/db/queries/billing";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function getSubscriptionStatus(userId: string) {
  const user = await getUserWithBilling(userId);
  if (!user) return null;
  return {
    status: user.subscriptionStatus,
    planId: user.stripePriceId,
    currentPeriodEnd: user.currentPeriodEnd,
  };
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const user = await getUserWithBilling(userId);
  if (!user) return false;
  return ACTIVE_STATUSES.has(user.subscriptionStatus);
}

export async function requireSubscription() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { authorized: false as const, reason: "unauthenticated" };
  }

  const hasSubscription = await hasActiveSubscription(session.user.id);
  if (!hasSubscription) {
    return { authorized: false as const, reason: "no_subscription" };
  }

  return { authorized: true as const, userId: session.user.id };
}
