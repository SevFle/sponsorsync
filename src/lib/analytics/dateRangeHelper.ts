import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subWeeks,
  subDays,
  startOfYear,
  endOfYear,
  format,
  parseISO,
  isValid,
} from "date-fns";

export type DateRangePreset = "7d" | "30d" | "90d" | "this_month" | "last_month" | "this_year";

export interface DateRange {
  from: Date;
  to: Date;
}

export function resolveDateRange(preset: DateRangePreset, referenceDate?: Date): DateRange {
  const ref = referenceDate ?? new Date();

  switch (preset) {
    case "7d":
      return { from: subDays(ref, 6), to: ref };
    case "30d":
      return { from: subDays(ref, 29), to: ref };
    case "90d":
      return { from: subDays(ref, 89), to: ref };
    case "this_month":
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case "last_month":
      return { from: startOfMonth(subMonths(ref, 1)), to: endOfMonth(subMonths(ref, 1)) };
    case "this_year":
      return { from: startOfYear(ref), to: endOfYear(ref) };
  }
}

export function isInRange(date: Date | string | null | undefined, range: DateRange): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return false;
  return d >= range.from && d <= range.to;
}

export function formatMonthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function formatWeekKey(date: Date): string {
  return format(date, "yyyy-ww");
}

export function formatDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getMonthRange(monthsBack: number, referenceDate?: Date): DateRange {
  const ref = referenceDate ?? new Date();
  return {
    from: startOfMonth(subMonths(ref, monthsBack)),
    to: endOfMonth(ref),
  };
}

export function getWeekRange(weeksBack: number, referenceDate?: Date): DateRange {
  const ref = referenceDate ?? new Date();
  return {
    from: startOfWeek(subWeeks(ref, weeksBack)),
    to: endOfWeek(ref),
  };
}

export function parseFlexibleDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
];
