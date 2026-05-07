"use client";

import { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow, differenceInDays, isPast, isFuture } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type DealStatus } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Deal {
  id: string;
  sponsorName: string;
  title: string;
  status: DealStatus;
  totalValue: number | null;
  currency: string;
  endDate: string | null;
}

interface Deliverable {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  dealTitle?: string;
  sponsorName?: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  createdAt: string;
  dealTitle?: string;
  sponsorName?: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function MetricCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string | number;
  accentColor: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className={`h-1 ${accentColor}`} />
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function DeadlineRow({ deliverable }: { deliverable: Deliverable }) {
  if (!deliverable.dueDate) return null;

  const date = new Date(deliverable.dueDate);
  const daysUntil = differenceInDays(date, new Date());
  const overdue = isPast(date);

  let dotColor = "bg-blue-500";
  if (overdue) dotColor = "bg-red-500";
  else if (daysUntil <= 3) dotColor = "bg-amber-500";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{deliverable.title}</p>
        <p className="truncate text-xs text-gray-500">{deliverable.sponsorName}</p>
      </div>
      <span className="shrink-0 text-xs text-gray-500">
        {overdue
          ? `Overdue (${Math.abs(daysUntil)}d)`
          : daysUntil === 0
            ? "Today"
            : `${daysUntil}d left`}
      </span>
    </div>
  );
}

function ActivityRow({
  type,
  title,
  subtitle,
  timeAgo,
}: {
  type: string;
  title: string;
  subtitle: string;
  timeAgo: string;
}) {
  return (
    <div className="rounded border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="truncate text-xs text-gray-500">{subtitle}</p>
        </div>
        <span className="shrink-0 text-xs text-gray-400">{timeAgo}</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
            <Skeleton className="h-1 w-full" />
            <div className="px-4 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="mb-3 h-3 w-36" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-3 h-3 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded border border-gray-100 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-sm font-medium text-red-800">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const [dealsRes, deliverablesRes, paymentsRes] = await Promise.all([
        fetch("/api/deals", { signal }),
        fetch("/api/deliverables", { signal }),
        fetch("/api/payments", { signal }),
      ]);

      if (!dealsRes.ok || !deliverablesRes.ok || !paymentsRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const [dealsData, deliverablesData, paymentsData] = await Promise.all([
        dealsRes.json(),
        deliverablesRes.json(),
        paymentsRes.json(),
      ]);

      setDeals(dealsData.deals ?? []);
      setDeliverables(deliverablesData.deliverables ?? []);
      setPayments(paymentsData.payments ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [fetchDashboardData]);

  const activeDeals = deals.filter((d) => d.status === "active").length;
  const draftDeals = deals.filter((d) => d.status === "draft").length;
  const completedDeals = deals.filter((d) => d.status === "completed").length;

  const revenueMtd = payments
    .filter((p) => p.status === "paid" && p.paidDate)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingDeliverables = deliverables.filter(
    (d) => d.status === "pending" || d.status === "in_progress"
  ).length;

  const overduePayments = payments.filter(
    (p) => p.status === "overdue" || (p.status === "pending" && p.dueDate && isPast(new Date(p.dueDate)))
  ).length;

  const upcomingDeliverables = deliverables
    .filter((d) => d.dueDate && isFuture(new Date(d.dueDate)) && d.status !== "verified" && d.status !== "missed")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentActivity = recentPayments.map((p) => ({
    type: p.status === "paid" ? "payment" : "pending_payment",
    title: p.status === "paid" ? "Payment received" : "Payment pending",
    subtitle: `${p.sponsorName ?? "Unknown"} \u2014 ${formatCurrency(p.amount, p.currency ?? "USD")}`,
    timeAgo: formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }),
  }));

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your sponsorship activity." />
        <div className="mt-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your sponsorship activity." />
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={() => fetchDashboardData()} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your sponsorship activity."
        action={
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
        }
      />

      <div className="mt-6 space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Active Deals" value={activeDeals} accentColor="bg-blue-500" />
          <MetricCard label="Revenue (MTD)" value={formatCurrency(revenueMtd, "USD")} accentColor="bg-green-500" />
          <MetricCard label="Pending Deliverables" value={pendingDeliverables} accentColor="bg-amber-500" />
          <MetricCard label="Overdue Payments" value={overduePayments} accentColor="bg-red-500" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Upcoming Deadlines
            </h2>
            {upcomingDeliverables.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                <p className="text-sm font-medium text-gray-900">No upcoming deadlines</p>
                <p className="mt-1 text-sm text-gray-500">All deliverables are up to date.</p>
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
                <p className="text-sm font-medium text-gray-900">No recent activity</p>
                <p className="mt-1 text-sm text-gray-500">Activity will appear here as you work with sponsors.</p>
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
                <span className="text-2xl font-bold text-amber-700">{draftDeals}</span>
              </div>
              <p className="mt-2 text-xs text-amber-600">Draft deals awaiting review</p>
            </a>
            <a
              href="/dashboard/deals"
              className="rounded-lg border border-green-200 bg-green-50 p-4 transition-colors hover:bg-green-100"
            >
              <div className="flex items-center justify-between">
                <StatusBadge status="active" />
                <span className="text-2xl font-bold text-green-700">{activeDeals}</span>
              </div>
              <p className="mt-2 text-xs text-green-600">Currently running sponsorships</p>
            </a>
            <a
              href="/dashboard/deals"
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
            >
              <div className="flex items-center justify-between">
                <StatusBadge status="completed" />
                <span className="text-2xl font-bold text-slate-600">{completedDeals}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Successfully finished deals</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
