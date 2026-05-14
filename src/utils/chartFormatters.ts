import { format, parseISO } from "date-fns";

export function formatChartCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value}`;
}

export function formatChartPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatChartNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPeriodLabel(period: string): string {
  try {
    if (period.includes("-W")) {
      return period;
    }
    if (/^\d{4}-\d{2}$/.test(period)) {
      const date = parseISO(`${period}-01`);
      return format(date, "MMM yyyy");
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      const date = parseISO(period);
      return format(date, "MMM d");
    }
    return period;
  } catch {
    return period;
  }
}

export const CHART_COLORS = {
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  slate: "#64748b",
} as const;
