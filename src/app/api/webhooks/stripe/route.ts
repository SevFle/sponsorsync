import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { constructWebhookEvent, mapStripeStatusToLocal } from "@/lib/stripe";
import {
  getUserByStripeCustomerId,
  updateSubscriptionStatus,
  getUserByStripeSubscriptionId,
} from "@/lib/db/queries/billing";
import type Stripe from "stripe";

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.userId;
  if (!userId) {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;
    if (customerId) {
      const user = await getUserByStripeCustomerId(customerId);
      if (user) {
        userId = user.id;
      }
    }
  }
  if (!userId) {
    console.warn("handleSubscriptionChange: no userId found in metadata or customer lookup for subscription", subscription.id);
    return;
  }

  const localStatus = mapStripeStatusToLocal(subscription.status);

  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start;
  const currentPeriodEnd = firstItem?.current_period_end;

  await updateSubscriptionStatus(userId, {
    stripeSubscriptionId: subscription.id,
    stripePriceId: firstItem?.price.id,
    subscriptionStatus: localStatus,
    ...(currentPeriodStart != null ? { currentPeriodStart: new Date(currentPeriodStart * 1000) } : {}),
    ...(currentPeriodEnd != null ? { currentPeriodEnd: new Date(currentPeriodEnd * 1000) } : {}),
  });
}

async function clearSubscription(userId: string) {
  await updateSubscriptionStatus(userId, {
    stripeSubscriptionId: undefined,
    stripePriceId: undefined,
    subscriptionStatus: "free",
    currentPeriodStart: undefined,
    currentPeriodEnd: undefined,
  });
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  const userId = customer.metadata?.userId;
  if (!userId) return;
  await clearSubscription(userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    const user = await getUserByStripeSubscriptionId(subscription.id);
    if (!user) return;
    await clearSubscription(user.id);
    return;
  }
  await clearSubscription(userId);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(customer);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.userId && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          const user = await getUserByStripeCustomerId(
            session.customer as string
          );
          if (user) {
            await updateSubscriptionStatus(user.id, {
              stripeSubscriptionId: subId,
              subscriptionStatus: "active",
            });
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (customerId) {
          const user = await getUserByStripeCustomerId(customerId);
          if (user) {
            await updateSubscriptionStatus(user.id, {
              subscriptionStatus: "past_due",
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Error handling Stripe event ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
