import { addDays, differenceInDays, format } from "date-fns";

export interface DeadlineAlert {
  dealId: string;
  dealTitle: string;
  deliverableTitle: string;
  dueDate: Date;
  daysRemaining: number;
  severity: "info" | "warning" | "critical";
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
        deliverableTitle: d.title,
        dueDate: due,
        daysRemaining,
        severity: daysRemaining <= 1 ? "critical" as const : daysRemaining <= 3 ? "warning" as const : "info" as const,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function formatDeadlineDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}
