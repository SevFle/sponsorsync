import { addDays, differenceInDays, format } from "date-fns";
import { resolveReminderSchedule } from "@/lib/deadlines/config";

export interface DeadlineAlert {
  dealId: string;
  dealTitle: string;
  deliverableId: string;
  deliverableTitle: string;
  dueDate: Date;
  daysRemaining: number;
  severity: "info" | "warning" | "critical";
  reminderTier: number;
  isOverdue: boolean;
}

export function getUpcomingDeadlines(
  deliverables: {
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    dealId: string;
    dealTitle: string;
  }[],
  lookAheadDays: number = 7
): DeadlineAlert[] {
  const now = new Date();
  const cutoff = addDays(now, lookAheadDays);

  return deliverables
    .filter((d) => {
      if (!d.dueDate || d.status === "verified" || d.status === "submitted") return false;
      const due = new Date(d.dueDate);
      return due <= cutoff;
    })
    .map((d) => {
      const due = new Date(d.dueDate!);
      const daysRemaining = differenceInDays(due, now);
      return {
        dealId: d.dealId,
        dealTitle: d.dealTitle,
        deliverableId: d.id,
        deliverableTitle: d.title,
        dueDate: due,
        daysRemaining,
        severity: daysRemaining <= 1 ? "critical" as const : daysRemaining <= 3 ? "warning" as const : "info" as const,
        reminderTier: daysRemaining,
        isOverdue: daysRemaining <= 0,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export interface TieredDeadlineAlert {
  dealId: string;
  dealTitle: string;
  deliverableId: string;
  deliverableTitle: string;
  dueDate: Date;
  daysRemaining: number;
  matchedTier: number;
  severity: "info" | "warning" | "critical";
  isOverdue: boolean;
}

export function getTieredDeadlineAlerts(
  deliverables: {
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    dealId: string;
    dealTitle: string;
  }[],
  userSchedule: number[] | null | undefined
): TieredDeadlineAlert[] {
  const schedule = resolveReminderSchedule(userSchedule);
  const now = new Date();
  const alerts: TieredDeadlineAlert[] = [];

  for (const d of deliverables) {
    if (!d.dueDate || d.status === "verified" || d.status === "submitted") continue;

    const due = new Date(d.dueDate);
    const daysRemaining = differenceInDays(due, now);
    const isOverdue = daysRemaining <= 0;

    if (isOverdue) {
      alerts.push({
        dealId: d.dealId,
        dealTitle: d.dealTitle,
        deliverableId: d.id,
        deliverableTitle: d.title,
        dueDate: due,
        daysRemaining,
        matchedTier: 0,
        severity: "critical",
        isOverdue: true,
      });
      continue;
    }

    for (const tier of schedule) {
      const matchesTier = daysRemaining > 0 && daysRemaining <= tier;
      if (matchesTier) {
        alerts.push({
          dealId: d.dealId,
          dealTitle: d.dealTitle,
          deliverableId: d.id,
          deliverableTitle: d.title,
          dueDate: due,
          daysRemaining,
          matchedTier: tier,
          severity: daysRemaining <= 1 ? "critical" : daysRemaining <= 3 ? "warning" : "info",
          isOverdue: false,
        });
        break;
      }
    }
  }

  return alerts.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.daysRemaining - b.daysRemaining;
  });
}

export function buildNotificationKey(
  deliverableId: string,
  type: "deadline_reminder" | "overdue_deliverable",
  tier?: number
): string {
  if (type === "overdue_deliverable") {
    const today = format(new Date(), "yyyy-MM-dd");
    return `overdue:${deliverableId}:${today}`;
  }
  return `reminder:${deliverableId}:tier-${tier ?? 0}`;
}

export function formatDeadlineDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}
