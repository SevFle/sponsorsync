"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow, isFuture } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DeadlineRow } from "@/components/dashboard/deadline-row";
import { ActivityRow } from "@/components/dashboard/activity-row";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ErrorBanner } from "@/components/dashboard/error-banner";
import { formatCurrency } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type {
  DashboardData,
  DashboardDeliverable,
  DashboardPayment,
} from "@/types/dashboard";

function getUpcomingDeliverables(deliverables: DashboardDeliverable[]) {
  return deliverables
    .filter(
      (d) =>
        d.dueDate &&
        isFuture(new Date(d.dueDate)) &&
        d.status !== "verified" &&
        d.status !== "missed"
    )
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);
}

function getRecentActivity(payments: DashboardPayment[]) {
  const recent = [...payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return recent.map((p) => ({
    type: p.status === "paid" ? "payment" : "pending_payment",
    title: p.status === "paid" ? "Payment received" : "Payment pending",
    subtitle: `${p.sponsorName ?? "Unknown"} \u2014 ${formatCurrency(p.amount, p.currency ?? "USD")}`,
    timeAgo: formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }),
  }));
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<DashboardData>("/api/dashboard", {
        signal,
      });
      setData(result);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    fetchDashboard(controller.signal);
    return () => controller.abort();
  }, [fetchDashboard, isAuthenticated]);

  if (!isAuthenticated) return null;

  const headerAction = (
    <div className="flex gap-2">
      <a
        href="/dashboard/deals/new"
        className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        New Deal
      </a>
      <a
        href="/dashboard/sponsors/new"
        className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
      >
        New Sponsor
      </a>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your sponsorship activity."
        action={headerAction}
      />

      <div className="mt-6">
        {loading && !data ? (
          <DashboardSkeleton />
        ) : error && !data ? (
          <ErrorBanner
            message={error}
            onRetry={() => fetchDashboard()}
          />
        ) : data ? (
          <DashboardContent data={data} />
        ) : null}
      </div>
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const deals = data.deals;
  const deliverables = data.deliverables;
  const payments = data.payments;
  const metrics = data.metrics;

  const upcomingDeliverables = getUpcomingDeliverables(
    deliverables as DashboardDeliverable[]
  );
  const recentActivity = getRecentActivity(payments);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Active Deals"
          value={metrics.activeDeals}
          accentColor="bg-blue-500"
        />
        <MetricCard
          label="Revenue (MTD)"
          value={formatCurrency(metrics.revenueMtd, "USD")}
          accentColor="bg-green-500"
        />
        <MetricCard
          label="Pending Deliverables"
          value={metrics.pendingDeliverables}
          accentColor="bg-amber-500"
        />
        <MetricCard
          label="Overdue Payments"
          value={metrics.overduePayments}
          accentColor="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            Upcoming Deadlines
          </h2>
          {upcomingDeliverables.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-900">
                No upcoming deadlines
              </p>
              <p className="mt-1 text-sm text-gray-500">
                All deliverables are up to date.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDeliverables.map((d) => (
                <DeadlineRow key={d.id} deliverable={d} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-900">
                No recent activity
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Activity will appear here as you work with sponsors.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((activity, i) => (
                <ActivityRow key={i} {...activity} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Deal Pipeline
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <a
            href="/dashboard/deals"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
          >
            <div className="flex items-center justify-between">
              <StatusBadge status="draft" />
              <span className="text-2xl font-bold text-amber-700">
                {metrics.draftDeals}
              </span>
            </div>
            <p className="mt-2 text-xs text-amber-600">
              Draft deals awaiting review
            </p>
          </a>
          <a
            href="/dashboard/deals"
            className="rounded-lg border border-green-200 bg-green-50 p-4 transition-colors hover:bg-green-100"
          >
            <div className="flex items-center justify-between">
              <StatusBadge status="active" />
              <span className="text-2xl font-bold text-green-700">
                {metrics.activeDeals}
              </span>
            </div>
            <p className="mt-2 text-xs text-green-600">
              Currently running sponsorships
            </p>
          </a>
          <a
            href="/dashboard/deals"
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
          >
            <div className="flex items-center justify-between">
              <StatusBadge status="completed" />
              <span className="text-2xl font-bold text-slate-600">
                {metrics.completedDeals}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Successfully finished deals
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
