import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast, isFuture, differenceInDays } from "date-fns";
import { StatusBadge, type DealStatus } from "./status-badge";

export interface DealCardDeal {
  id: string;
  sponsorName: string;
  title: string;
  description: string | null;
  status: DealStatus;
  totalValue: number | null;
  currency: string;
  endDate: string | null;
  progress: number;
}

interface DealCardProps {
  deal: DealCardDeal;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function DeadlineIndicator({ endDate }: { endDate: string | null }) {
  if (!endDate) return null;

  const date = new Date(endDate);
  const daysUntil = differenceInDays(date, new Date());

  if (isPast(date)) {
    return (
      <span className="text-xs font-medium text-red-600">
        Overdue by {Math.abs(daysUntil)}d
      </span>
    );
  }

  if (daysUntil <= 7) {
    return (
      <span className="text-xs font-medium text-amber-600">
        Due in {daysUntil}d ({format(date, "MMM d")})
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-500">
      Due {format(date, "MMM d, yyyy")}
    </span>
  );
}

const progressBarColors: Record<DealStatus, string> = {
  active: "bg-green-500",
  draft: "bg-amber-500",
  completed: "bg-slate-400",
  cancelled: "bg-gray-300",
};

export function DealCard({ deal }: DealCardProps) {
  const progressWidth = `${Math.min(100, Math.max(0, deal.progress))}%`;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {deal.sponsorName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-gray-500">{deal.title}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {deal.totalValue != null && (
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(deal.totalValue, deal.currency)}
            </span>
          )}
          <StatusBadge status={deal.status} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn("h-full rounded-full transition-all", progressBarColors[deal.status])}
            style={{ width: progressWidth }}
            role="progressbar"
            aria-valuenow={deal.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <DeadlineIndicator endDate={deal.endDate} />
      </div>
    </div>
  );
}
