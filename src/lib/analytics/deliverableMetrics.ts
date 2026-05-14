import { parseFlexibleDate, type DateRange } from "./dateRangeHelper";

export interface DeliverableLike {
  status: string;
  dueDate: string | Date | null;
  completedDate: string | Date | null;
}

export interface DeliverableStatusCounts {
  pending: number;
  in_progress: number;
  submitted: number;
  verified: number;
  missed: number;
}

export interface DeliverableMetricsResult {
  statusCounts: DeliverableStatusCounts;
  total: number;
  completionRate: number;
  onTimeRate: number;
  overdueCount: number;
  verifiedCount: number;
  missedCount: number;
}

function isOverdueDeliverable(d: DeliverableLike): boolean {
  if (d.status === "verified" || d.status === "missed") return false;
  const due = parseFlexibleDate(d.dueDate);
  if (!due) return false;
  return due < new Date();
}

function isOnTime(d: DeliverableLike): boolean {
  if (d.status !== "verified") return false;
  const completed = parseFlexibleDate(d.completedDate);
  const due = parseFlexibleDate(d.dueDate);
  if (!completed || !due) return true;
  return completed <= due;
}

export function computeStatusCounts(deliverables: DeliverableLike[]): DeliverableStatusCounts {
  const counts: DeliverableStatusCounts = {
    pending: 0,
    in_progress: 0,
    submitted: 0,
    verified: 0,
    missed: 0,
  };

  for (const d of deliverables) {
    const key = d.status as keyof DeliverableStatusCounts;
    if (key in counts) {
      counts[key]++;
    }
  }

  return counts;
}

export function computeDeliverableMetrics(
  deliverables: DeliverableLike[],
  range?: DateRange
): DeliverableMetricsResult {
  const filtered = range
    ? deliverables.filter((d) => {
        const due = parseFlexibleDate(d.dueDate);
        return due !== null && due >= range.from && due <= range.to;
      })
    : deliverables;

  const statusCounts = computeStatusCounts(filtered);
  const total = filtered.length;
  const completionRate = total > 0 ? (statusCounts.verified / total) * 100 : 0;
  const verifiedDeliverables = filtered.filter((d) => d.status === "verified");
  const onTimeVerified = verifiedDeliverables.filter(isOnTime).length;
  const onTimeRate = verifiedDeliverables.length > 0
    ? (onTimeVerified / verifiedDeliverables.length) * 100
    : 0;
  const overdueCount = filtered.filter(isOverdueDeliverable).length;

  return {
    statusCounts,
    total,
    completionRate: Math.round(completionRate * 10) / 10,
    onTimeRate: Math.round(onTimeRate * 10) / 10,
    overdueCount,
    verifiedCount: statusCounts.verified,
    missedCount: statusCounts.missed,
  };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "#f59e0b";
    case "in_progress":
      return "#3b82f6";
    case "submitted":
      return "#8b5cf6";
    case "verified":
      return "#10b981";
    case "missed":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}
