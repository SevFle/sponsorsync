"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface Plan {
  name: string;
  amount: number;
  priceId: string | null;
}

export function BillingActions({
  plans,
  hasCustomerId,
  isActive,
}: {
  plans: Record<string, Plan>;
  hasCustomerId: boolean;
  isActive: boolean;
}) {
  return (
    <>
      {isActive && hasCustomerId && <ManageBillingButton />}
      {!isActive && <UpgradePlans plans={plans} />}
    </>
  );
}

function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePortal = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<{ url: string }>("/api/billing/portal", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePortal}
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Manage Billing"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function UpgradePlans({ plans }: { plans: Record<string, Plan> }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setError(null);
    setLoadingPlan(planId);
    try {
      const data = await apiFetch<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.entries(plans).map(([id, plan]) => (
          <div
            key={id}
            className="rounded-lg border p-6 transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-2 text-2xl font-bold">
              {formatAmount(plan.amount)}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </p>
            <button
              onClick={() => handleCheckout(id)}
              disabled={loadingPlan === id}
              className="mt-4 w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {loadingPlan === id ? "Redirecting..." : `Subscribe to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
