import { formatMonthKey, parseFlexibleDate, type DateRange } from "./dateRangeHelper";

export interface PaymentLike {
  amount: number;
  status: string;
  paidDate: string | Date | null;
  dueDate: string | Date | null;
  currency?: string | null;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  paymentCount: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalPending: number;
  totalOverdue: number;
  averagePayment: number;
  monthOverMonthChange: number;
  monthlyBreakdown: MonthlyRevenue[];
}

function isPaid(p: PaymentLike): boolean {
  return p.status === "paid" && !!p.paidDate;
}

function isPending(p: PaymentLike): boolean {
  return p.status === "pending";
}

function isOverdue(p: PaymentLike): boolean {
  if (p.status === "overdue") return true;
  if (p.status !== "pending") return false;
  const due = parseFlexibleDate(p.dueDate);
  return due !== null && due < new Date();
}

export function aggregateRevenueByMonth(
  payments: PaymentLike[],
  range?: DateRange
): MonthlyRevenue[] {
  const map = new Map<string, { revenue: number; count: number }>();

  for (const p of payments) {
    if (!isPaid(p)) continue;

    const paidDate = parseFlexibleDate(p.paidDate);
    if (!paidDate) continue;

    if (range && (paidDate < range.from || paidDate > range.to)) continue;

    const key = formatMonthKey(paidDate);
    const existing = map.get(key) ?? { revenue: 0, count: 0 };
    existing.revenue += p.amount;
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      paymentCount: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function computeRevenueSummary(payments: PaymentLike[], range?: DateRange): RevenueSummary {
  const monthlyBreakdown = aggregateRevenueByMonth(payments, range);

  const totalRevenue = monthlyBreakdown.reduce((sum, m) => sum + m.revenue, 0);
  const totalPending = payments.filter(isPending).reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments.filter(isOverdue).reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter(isPaid).length;
  const averagePayment = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;

  let monthOverMonthChange = 0;
  if (monthlyBreakdown.length >= 2) {
    const current = monthlyBreakdown[monthlyBreakdown.length - 1].revenue;
    const previous = monthlyBreakdown[monthlyBreakdown.length - 2].revenue;
    monthOverMonthChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  return {
    totalRevenue,
    totalPending,
    totalOverdue,
    averagePayment,
    monthOverMonthChange,
    monthlyBreakdown,
  };
}
