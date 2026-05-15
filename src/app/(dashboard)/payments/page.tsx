"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  calculateTotalPaid,
  calculateTotalOutstanding,
  calculateTotalOverdue,
  getDueDateStatus,
  type DueDateStatus,
} from "@/domain/payments";

type FilterTab = "all" | PaymentStatus;

interface Payment {
  id: string;
  dealId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate: string | null;
  paidDate: string | null;
  invoiceUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  dealTitle: string;
  sponsorName: string;
}

interface DealOption {
  id: string;
  sponsorName: string;
  title: string;
}

interface PaymentsResponse {
  payments: Payment[];
}

interface DealsResponse {
  deals: DealOption[];
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Payments" },
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
  { key: "cancelled", label: "Cancelled" },
];

type SortOption =
  | "dueDate-asc"
  | "dueDate-desc"
  | "amount-desc"
  | "amount-asc"
  | "sponsorName-asc"
  | "sponsorName-desc"
  | "status-asc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "dueDate-asc", label: "Due date (nearest)" },
  { value: "dueDate-desc", label: "Due date (farthest)" },
  { value: "amount-desc", label: "Amount (high to low)" },
  { value: "amount-asc", label: "Amount (low to high)" },
  { value: "sponsorName-asc", label: "Sponsor (A-Z)" },
  { value: "sponsorName-desc", label: "Sponsor (Z-A)" },
  { value: "status-asc", label: "Status (A-Z)" },
];

function sortPayments(payments: Payment[], sort: SortOption): Payment[] {
  const sorted = [...payments];
  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const mult = dir === "desc" ? -1 : 1;

  sorted.sort((a, b) => {
    switch (field) {
      case "dueDate": {
        const aT = a.dueDate ? new Date(a.dueDate).getTime() : null;
        const bT = b.dueDate ? new Date(b.dueDate).getTime() : null;
        if (aT === null && bT === null) return 0;
        if (aT === null) return 1;
        if (bT === null) return -1;
        return mult * (aT - bT);
      }
      case "amount":
        return mult * (a.amount - b.amount);
      case "sponsorName":
        return mult * a.sponsorName.localeCompare(b.sponsorName);
      case "status":
        return mult * a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  return sorted;
}

function DueDateIndicator({ payment }: { payment: Payment }) {
  const status = getDueDateStatus(payment.dueDate, payment.status);

  if (status === "paid") {
    if (payment.paidDate) {
      return (
        <span className="text-xs text-gray-500">
          Paid {format(new Date(payment.paidDate), "MMM d, yyyy")}
        </span>
      );
    }
    return <span className="text-xs text-gray-400">Paid</span>;
  }

  if (status === "no_due_date") {
    return <span className="text-xs text-gray-400">No due date</span>;
  }

  if (status === "overdue") {
    const daysOverdue = differenceInDays(new Date(), new Date(payment.dueDate!));
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {daysOverdue}d overdue
      </span>
    );
  }

  if (status === "due_soon") {
    const daysLeft = differenceInDays(new Date(payment.dueDate!), new Date());
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Due {format(new Date(payment.dueDate!), "MMM d")} ({daysLeft}d left)
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-500">
      Due {format(new Date(payment.dueDate!), "MMM d, yyyy")}
    </span>
  );
}

function SummaryCards({ payments }: { payments: Payment[] }) {
  const totalPaid = calculateTotalPaid(payments);
  const totalOutstanding = calculateTotalOutstanding(payments);
  const totalOverdue = calculateTotalOverdue(payments);
  const currency = payments[0]?.currency ?? "USD";

  const cards = [
    {
      label: "Total Paid",
      value: formatCurrency(totalPaid, currency),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Outstanding",
      value: formatCurrency(totalOutstanding, currency),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Overdue",
      value: formatCurrency(totalOverdue, currency),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", card.color)}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentRow({
  payment,
  onUpdate,
}: {
  payment: Payment;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const dueDateStatus = getDueDateStatus(payment.dueDate, payment.status);

  const handleMarkPaid = async () => {
    setUpdating(true);
    try {
      await apiFetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "paid",
          paidDate: format(new Date(), "yyyy-MM-dd"),
        }),
      });
      onUpdate();
    } catch {
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkOverdue = async () => {
    setUpdating(true);
    try {
      await apiFetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "overdue" }),
      });
      onUpdate();
    } catch {
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    setUpdating(true);
    try {
      await apiFetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      onUpdate();
    } catch {
    } finally {
      setUpdating(false);
    }
  };

  const rowBorderColor =
    dueDateStatus === "overdue"
      ? "border-red-200 bg-red-50/30"
      : dueDateStatus === "due_soon"
        ? "border-amber-200 bg-amber-50/30"
        : "border-gray-200 bg-gray-50";

  return (
    <div className={cn("rounded-lg border transition-colors", rowBorderColor)}>
      <button
        type="button"
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-100/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">
              {payment.sponsorName}
            </p>
            <PaymentStatusBadge status={payment.status} />
          </div>
          <p className="truncate text-xs text-gray-500">{payment.dealTitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-gray-900">
            {formatCurrency(payment.amount, payment.currency)}
          </p>
          <DueDateIndicator payment={payment} />
        </div>
        <svg
          className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", expanded && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500">Deal</p>
              <p className="text-gray-900">{payment.dealTitle}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Amount</p>
              <p className="text-gray-900">{formatCurrency(payment.amount, payment.currency)}</p>
            </div>
            {payment.dueDate && (
              <div>
                <p className="text-xs font-medium text-gray-500">Due Date</p>
                <p className="text-gray-900">{format(new Date(payment.dueDate), "MMM d, yyyy")}</p>
              </div>
            )}
            {payment.paidDate && (
              <div>
                <p className="text-xs font-medium text-gray-500">Paid Date</p>
                <p className="text-gray-900">{format(new Date(payment.paidDate), "MMM d, yyyy")}</p>
              </div>
            )}
            {payment.invoiceUrl && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500">Invoice</p>
                <a
                  href={payment.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {payment.invoiceUrl}
                </a>
              </div>
            )}
            {payment.notes && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500">Notes</p>
                <p className="text-gray-700">{payment.notes}</p>
              </div>
            )}
          </div>

          {payment.status !== "paid" && payment.status !== "cancelled" && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={updating}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {updating ? "Updating..." : "Mark Paid"}
              </button>
              {payment.status === "pending" && (
                <button
                  type="button"
                  onClick={handleMarkOverdue}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark Overdue
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={updating}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel Payment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="ml-auto h-4 w-20" />
            <Skeleton className="ml-auto h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordPaymentModal({
  deals,
  open,
  onClose,
  onSuccess,
}: {
  deals: DealOption[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [dealId, setDealId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dealId) {
      setError("Please select a deal");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          dealId,
          amount: Math.round(Number(amount)),
          currency: "USD",
          ...(dueDate ? { dueDate } : {}),
        }),
      });
      setDealId("");
      setAmount("");
      setDueDate("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
        <p className="mt-1 text-sm text-gray-500">Add a new payment to track.</p>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label htmlFor="deal" className="block text-sm font-medium text-gray-700">
              Deal
            </label>
            <select
              id="deal"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a deal</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.sponsorName} — {deal.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount ($)
            </label>
            <input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState<SortOption>("dueDate-asc");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const [paymentsData, dealsData] = await Promise.all([
        apiFetch<PaymentsResponse>("/api/payments", { signal }),
        apiFetch<DealsResponse>("/api/deals", { signal }),
      ]);

      setPayments(paymentsData.payments ?? []);
      setDeals(
        (dealsData.deals ?? []).map((d: DealOption) => ({
          id: d.id,
          sponsorName: d.sponsorName,
          title: d.title,
        }))
      );
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (sessionStatus !== "authenticated") return;

    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, sessionStatus, router]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesTab = activeTab === "all" || payment.status === activeTab;

      const query = search.toLowerCase();
      const matchesSearch =
        query === "" ||
        payment.sponsorName.toLowerCase().includes(query) ||
        payment.dealTitle.toLowerCase().includes(query) ||
        payment.status.toLowerCase().includes(query);

      let matchesDateRange = true;
      if (startDate && payment.dueDate) {
        matchesDateRange = payment.dueDate >= startDate;
      }
      if (endDate && payment.dueDate) {
        matchesDateRange = matchesDateRange && payment.dueDate <= endDate;
      }
      if ((startDate || endDate) && !payment.dueDate) {
        matchesDateRange = false;
      }

      return matchesTab && matchesSearch && matchesDateRange;
    });
  }, [payments, activeTab, search, startDate, endDate]);

  const sortedFilteredPayments = useMemo(
    () => sortPayments(filteredPayments, sort),
    [filteredPayments, sort]
  );

  const hasFilters = search !== "" || activeTab !== "all" || startDate !== "" || endDate !== "";

  if (sessionStatus !== "authenticated") {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Track and manage your sponsorship payments."
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Record Payment
          </button>
        }
      />

      <div className="mt-6">
        {loading ? <SummarySkeleton /> : <SummaryCards payments={payments} />}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by sponsor, deal, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="Filter from date"
          className="rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          aria-label="Filter to date"
          className="rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort payments"
          className="rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <PaymentsSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchData()}
              className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : sortedFilteredPayments.length === 0 ? (
          <EmptyState
            message={hasFilters ? "No payments match your filters" : "No payments yet"}
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Record your first payment to get started."
            }
          />
        ) : (
          sortedFilteredPayments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} onUpdate={() => fetchData()} />
          ))
        )}
      </div>

      <RecordPaymentModal
        deals={deals}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
