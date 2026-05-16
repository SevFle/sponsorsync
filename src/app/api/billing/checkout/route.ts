import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { createCheckoutSession, createOrRetrieveCustomer, isValidPlan, PLANS } from "@/lib/stripe";
import { getUserWithBilling, updateStripeCustomerId } from "@/lib/db/queries/billing";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let planId: string | undefined;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    planId = (body as { planId?: string }).planId;
  } else {
    const formData = await request.formData();
    planId = formData.get("planId") as string | null ?? undefined;
  }

  if (!planId || !isValidPlan(planId)) {
    return NextResponse.json(
      { error: "Invalid plan. Must be 'starter' or 'pro'." },
      { status: 422 }
    );
  }

  const plan = PLANS[planId];
  if (!plan.priceId) {
    return NextResponse.json(
      { error: "Plan is not configured. Please set the Stripe price ID." },
      { status: 500 }
    );
  }

  try {
    const user = await getUserWithBilling(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const customer = await createOrRetrieveCustomer({
      userId: user.id,
      email: user.email,
      existingCustomerId: user.stripeCustomerId,
    });

    if (!user.stripeCustomerId) {
      await updateStripeCustomerId(user.id, customer.id);
    }

    const checkoutSession = await createCheckoutSession({
      customerId: customer.id,
      priceId: plan.priceId,
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
