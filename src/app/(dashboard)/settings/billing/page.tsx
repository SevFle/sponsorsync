import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getUserWithBilling } from "@/lib/db/queries/billing";
import { PLANS, type PlanId } from "@/lib/stripe";
import { PageHeader } from "@/components/ui/page-header";
import { redirect } from "next/navigation";

function getPlanFromPriceId(priceId: string | null): PlanId | null {
  if (!priceId) return null;
  for (const [id, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return id as PlanId;
  }
  return null;
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function BillingPage() {
  const session = await getAuthenticatedSession();
  if (!session) {
    redirect("/login");
  }

  const user = await getUserWithBilling(session.user.id);

  const isActive = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
  const isCanceled = user?.subscriptionStatus === "canceled";
  const currentPlan = getPlanFromPriceId(user?.stripePriceId ?? null);

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage your subscription and billing details."
      />

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Current Plan</h2>
          {isActive && currentPlan ? (
            <div className="mt-4">
              <p className="text-2xl font-bold">
                {PLANS[currentPlan].name}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {formatAmount(PLANS[currentPlan].amount)}/month
              </p>
              {user?.currentPeriodEnd && (
                <p className="mt-2 text-sm text-gray-500">
                  {isCanceled
                    ? `Access until ${new Date(user.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(user.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
              <div className="mt-4 flex gap-3">
                {user?.stripeCustomerId && (
                  <form action="/api/billing/portal" method="POST">
                    <button
                      type="submit"
                      className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                    >
                      Manage Billing
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-gray-600">
                {isCanceled
                  ? "Your subscription has been canceled."
                  : "You are on the free plan."}
              </p>
            </div>
          )}
        </div>

        {!isActive && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Upgrade Your Plan</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(PLANS).map(([id, plan]) => (
                <div
                  key={id}
                  className="rounded-lg border p-6 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-2xl font-bold">
                    {formatAmount(plan.amount)}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </p>
                  <form action="/api/billing/checkout" method="POST" className="mt-4">
                    <input type="hidden" name="planId" value={id} />
                    <button
                      type="submit"
                      className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                    >
                      Subscribe to {plan.name}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
