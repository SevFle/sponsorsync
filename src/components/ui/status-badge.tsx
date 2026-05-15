import { cn } from "@/lib/utils";

export type DealStatus = "draft" | "proposed" | "active" | "completed" | "cancelled";

const statusConfig: Record<DealStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-amber-100 text-amber-700",
  },
  proposed: {
    label: "Proposed",
    className: "bg-blue-100 text-blue-700",
  },
  active: {
    label: "Active",
    className: "bg-green-100 text-green-700",
  },
  completed: {
    label: "Completed",
    className: "bg-slate-100 text-slate-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-400",
  },
};

interface StatusBadgeProps {
  status: DealStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-700",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-400",
  },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = paymentStatusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
