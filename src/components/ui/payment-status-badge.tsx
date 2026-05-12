import { cn } from "@/lib/utils";

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
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
