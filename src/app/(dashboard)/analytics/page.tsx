"use client";

import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PipelineFunnel } from "@/components/dashboard/PipelineFunnel";
import { DeliverableStatusGrid } from "@/components/dashboard/DeliverableStatusGrid";
import { TrendLineChart } from "@/components/dashboard/TrendLineChart";
import { MetricCardEnhanced } from "@/components/dashboard/MetricCardEnhanced";
import { formatCurrency } from "@/lib/format";

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { range, setRange } = useDateRange();
  const { revenue, pipeline, deliverables, trends, isLoading, error } = useAnalytics(
    range,
    !authLoading && isAuthenticated
  );

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-red-600">Failed to load analytics: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your sponsorship performance and revenue trends.
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCardEnhanced
              label="Total Revenue"
              value={revenue ? formatCurrency(revenue.totalRevenue, "USD") : "$0"}
              change={revenue?.monthOverMonthChange}
              accentColor="bg-green-500"
              subtitle="period total"
            />
            <MetricCardEnhanced
              label="Pipeline Value"
              value={pipeline ? formatCurrency(pipeline.totalPipelineValue, "USD") : "$0"}
              accentColor="bg-blue-500"
              subtitle={`${pipeline?.totalDeals ?? 0} deals`}
            />
            <MetricCardEnhanced
              label="Completion Rate"
              value={deliverables ? `${deliverables.completionRate}%` : "0%"}
              accentColor="bg-purple-500"
              subtitle={`${deliverables?.verifiedCount ?? 0} verified`}
            />
            <MetricCardEnhanced
              label="Overdue Items"
              value={deliverables?.overdueCount ?? 0}
              accentColor="bg-red-500"
              subtitle={deliverables && deliverables.overdueCount > 0 ? "needs attention" : "all on track"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Monthly Revenue</h2>
              <RevenueChart data={revenue?.monthlyBreakdown ?? []} />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Deal Pipeline</h2>
              <PipelineFunnel stages={pipeline?.stages ?? []} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Deliverable Status</h2>
              <DeliverableStatusGrid
                statusCounts={deliverables?.statusCounts ?? { pending: 0, in_progress: 0, submitted: 0, verified: 0, missed: 0 }}
                total={deliverables?.total ?? 0}
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Revenue & Completion Trends</h2>
              <TrendLineChart
                revenueTrend={trends?.revenueTrend ?? []}
                completionTrend={trends?.completionTrend ?? []}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Key Insights</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Pending Revenue</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {revenue ? formatCurrency(revenue.totalPending, "USD") : "$0"}
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Overdue Revenue</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {revenue ? formatCurrency(revenue.totalOverdue, "USD") : "$0"}
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Avg. Payment</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {revenue ? formatCurrency(revenue.averagePayment, "USD") : "$0"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
