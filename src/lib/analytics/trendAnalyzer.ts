import { formatMonthKey, parseFlexibleDate, type DateRange } from "./dateRangeHelper";
import type { PaymentLike } from "./revenueAggregator";
import type { DeliverableLike } from "./deliverableMetrics";
import type { DealLike } from "./pipelineCalculator";

export type TrendGranularity = "monthly" | "weekly";

export interface TrendPoint {
  period: string;
  value: number;
}

export interface TrendData {
  revenue: TrendPoint[];
  dealCount: TrendPoint[];
  deliverableCompletion: TrendPoint[];
}

export interface TrendSummary {
  revenueTrend: TrendPoint[];
  dealTrend: TrendPoint[];
  completionTrend: TrendPoint[];
  revenueChange: number;
  dealChange: number;
  completionChange: number;
}

function groupByPeriod(
  items: { date: Date | null; value: number }[],
  granularity: TrendGranularity
): TrendPoint[] {
  const map = new Map<string, number>();

  for (const item of items) {
    if (!item.date) continue;
    const key = granularity === "monthly"
      ? formatMonthKey(item.date)
      : formatMonthKey(item.date);
    map.set(key, (map.get(key) ?? 0) + item.value);
  }

  return Array.from(map.entries())
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function computeChange(points: TrendPoint[]): number {
  if (points.length < 2) return 0;
  const current = points[points.length - 1].value;
  const previous = points[points.length - 2].value;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

export function analyzeRevenueTrend(
  payments: PaymentLike[],
  granularity: TrendGranularity = "monthly"
): TrendPoint[] {
  const items = payments
    .filter((p) => p.status === "paid" && p.paidDate)
    .map((p) => ({
      date: parseFlexibleDate(p.paidDate),
      value: p.amount,
    }));

  return groupByPeriod(items, granularity);
}

export function analyzeDealTrend(
  deals: DealLike[],
  createdDates: (string | Date | null)[],
  granularity: TrendGranularity = "monthly"
): TrendPoint[] {
  const items = deals.map((d, i) => ({
    date: parseFlexibleDate(createdDates[i] ?? null),
    value: 1,
  }));

  return groupByPeriod(items, granularity);
}

export function analyzeCompletionTrend(
  deliverables: DeliverableLike[],
  granularity: TrendGranularity = "monthly"
): TrendPoint[] {
  const items = deliverables
    .filter((d) => d.status === "verified" && d.completedDate)
    .map((d) => ({
      date: parseFlexibleDate(d.completedDate),
      value: 1,
    }));

  return groupByPeriod(items, granularity);
}

export function computeTrendSummary(
  payments: PaymentLike[],
  deals: DealLike[],
  dealCreatedDates: (string | Date | null)[],
  deliverables: DeliverableLike[]
): TrendSummary {
  const revenueTrend = analyzeRevenueTrend(payments);
  const dealTrend = analyzeDealTrend(deals, dealCreatedDates);
  const completionTrend = analyzeCompletionTrend(deliverables);

  return {
    revenueTrend,
    dealTrend,
    completionTrend,
    revenueChange: computeChange(revenueTrend),
    dealChange: computeChange(dealTrend),
    completionChange: computeChange(completionTrend),
  };
}
