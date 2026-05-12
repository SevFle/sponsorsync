import { differenceInDays, startOfDay, isPast } from "date-fns";
import type { DashboardDeliverable } from "@/types/dashboard";

export function DeadlineRow({ deliverable }: { deliverable: DashboardDeliverable }) {
  if (!deliverable.dueDate) return null;

  const date = new Date(deliverable.dueDate);
  const daysUntil = differenceInDays(startOfDay(date), startOfDay(new Date()));
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
