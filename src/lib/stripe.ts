import Stripe from "stripe";
import { config } from "@/lib/config";

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: config.stripe.starterPriceId,
    amount: 1900,
  },
  pro: {
    name: "Pro",
    priceId: config.stripe.proPriceId,
    amount: 4900,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function isValidPlan(planId: string): planId is PlanId {
  return planId in PLANS;
}

export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  userId: string;
  email: string;
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: `${config.app.url}/dashboard/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.app.url}/dashboard/settings/billing`,
    metadata: {
      userId: params.userId,
    },
    customer_email: params.customerId ? undefined : params.email,
    subscription_data: {
      metadata: {
        userId: params.userId,
      },
    },
  });
}

export async function createBillingPortalSession(params: {
  customerId: string;
}): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: `${config.app.url}/dashboard/settings/billing`,
  });
}

export async function createOrRetrieveCustomer(params: {
  userId: string;
  email: string;
  existingCustomerId?: string | null;
}): Promise<Stripe.Customer> {
  if (params.existingCustomerId) {
    const customer = await stripe.customers.retrieve(params.existingCustomerId);
    if (!customer.deleted) {
      return customer;
    }
  }

  return stripe.customers.create({
    email: params.email,
    metadata: {
      userId: params.userId,
    },
  });
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
}

export function isActiveSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

export function mapStripeStatusToLocal(
  stripeStatus: Stripe.Subscription.Status
): "active" | "past_due" | "canceled" | "trialing" | "paused" | "free" {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
      return "canceled";
    default:
      return "free";
  }
}
