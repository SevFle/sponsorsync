"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

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

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100">
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
        <p className="text-xs text-gray-500">
          {payment.paidDate
            ? `Paid ${format(new Date(payment.paidDate), "MMM d, yyyy")}`
            : payment.dueDate
              ? `Due ${format(new Date(payment.dueDate), "MMM d, yyyy")}`
              : "No due date"}
        </p>
      </div>
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

  const filteredPayments = payments.filter((payment) => {
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

  const sortedFilteredPayments = sortPayments(filteredPayments, sort);
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
            <PaymentRow key={payment.id} payment={payment} />
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
