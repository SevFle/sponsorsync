"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, isPast, differenceInDays, parseISO } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/payment-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  calculateTotalPaid,
  calculateTotalOutstanding,
} from "@/domain/payments";

type FilterTab = "all" | "pending" | "paid" | "overdue" | "cancelled" | "past_due";

type SortOption =
  | "dueDate-asc"
  | "dueDate-desc"
  | "amount-desc"
  | "amount-asc"
  | "status-asc"
  | "sponsorName-asc"
  | "sponsorName-desc";

export interface PaymentRow {
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

interface PaymentsResponse {
  payments: PaymentRow[];
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
  { key: "cancelled", label: "Cancelled" },
  { key: "past_due", label: "Past Due" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "dueDate-asc", label: "Due date (nearest)" },
  { value: "dueDate-desc", label: "Due date (farthest)" },
  { value: "amount-desc", label: "Amount (high to low)" },
  { value: "amount-asc", label: "Amount (low to high)" },
  { value: "sponsorName-asc", label: "Sponsor (A-Z)" },
  { value: "sponsorName-desc", label: "Sponsor (Z-A)" },
  { value: "status-asc", label: "Status (A-Z)" },
];

function sortPayments(payments: PaymentRow[], sort: SortOption): PaymentRow[] {
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

function isPaymentPastDue(payment: PaymentRow): boolean {
  if (payment.status === "paid" || payment.status === "cancelled") return false;
  if (!payment.dueDate) return false;
  return isPast(parseISO(payment.dueDate));
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function DueDateCell({ dueDate, status }: { dueDate: string | null; status: PaymentStatus }) {
  if (!dueDate) {
    return <span className="text-gray-400">—</span>;
  }

  const date = parseISO(dueDate);
  const daysUntil = differenceInDays(date, new Date());

  if (status === "overdue" || (status !== "paid" && status !== "cancelled" && isPast(date))) {
    return (
      <span className="text-xs font-medium text-red-600">
        Overdue by {Math.abs(daysUntil)}d
      </span>
    );
  }

  if (status !== "paid" && status !== "cancelled" && daysUntil <= 7) {
    return (
      <span className="text-xs font-medium text-amber-600">
        Due in {daysUntil}d ({format(date, "MMM d")})
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-500">
      {format(date, "MMM d, yyyy")}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-500">Sponsor</th>
            <th className="px-4 py-3 font-medium text-gray-500">Deal</th>
            <th className="px-4 py-3 font-medium text-gray-500">Amount</th>
            <th className="px-4 py-3 font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 font-medium text-gray-500">Due Date</th>
            <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
              <td className="px-4 py-3"><Skeleton className="h-8 w-20 rounded-md" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PaymentsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOption>("dueDate-asc");
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<PaymentsResponse>("/api/payments", { signal });
      setPayments(data.payments ?? []);
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
    fetchPayments(controller.signal);
    return () => controller.abort();
  }, [fetchPayments, sessionStatus, router]);

  const handleRecordPayment = useCallback(
    async (paymentId: string) => {
      setRecordingId(paymentId);
      try {
        await apiFetch(`/api/payments/${paymentId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "paid", paidDate: format(new Date(), "yyyy-MM-dd") }),
        });
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId
              ? { ...p, status: "paid" as PaymentStatus, paidDate: format(new Date(), "yyyy-MM-dd") }
              : p
          )
        );
      } catch {
        setError("Failed to record payment. Please try again.");
      } finally {
        setRecordingId(null);
      }
    },
    []
  );

  const filteredPayments = payments.filter((payment) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "past_due" ? isPaymentPastDue(payment) : payment.status === activeTab);
    const query = search.toLowerCase();
    const matchesSearch =
      query === "" ||
      payment.sponsorName.toLowerCase().includes(query) ||
      payment.dealTitle.toLowerCase().includes(query) ||
      payment.status.toLowerCase().includes(query) ||
      (payment.notes?.toLowerCase().includes(query) ?? false);
    return matchesTab && matchesSearch;
  });

  const sortedFilteredPayments = sortPayments(filteredPayments, sort);
  const hasFilters = search !== "" || activeTab !== "all";

  const totalPaid = calculateTotalPaid(payments);
  const totalOutstanding = calculateTotalOutstanding(payments);
  const overdueCount = payments.filter((p) => p.status === "overdue" || isPaymentPastDue(p)).length;

  if (sessionStatus !== "authenticated") {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Track payments, due dates, and overdue invoices."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Paid</p>
          <p className="mt-1 text-xl font-bold text-green-700">{formatCurrency(totalPaid, "USD")}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Outstanding</p>
          <p className="mt-1 text-xl font-bold text-amber-700">{formatCurrency(totalOutstanding, "USD")}</p>
        </div>
        <div className={cn(
          "rounded-lg border p-4",
          overdueCount > 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
        )}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Overdue</p>
          <p className={cn("mt-1 text-xl font-bold", overdueCount > 0 ? "text-red-700" : "text-gray-400")}>
            {overdueCount}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Search payments by sponsor, deal, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      <div className="mt-6">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchPayments()}
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
                : "Payments will appear here when deals have associated invoices."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Sponsor</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Deal</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Due Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sortedFilteredPayments.map((payment) => {
                  const pastDue = isPaymentPastDue(payment);
                  return (
                    <tr
                      key={payment.id}
                      className={cn(
                        "transition-colors hover:bg-gray-50",
                        pastDue && "bg-red-50/50 hover:bg-red-50"
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {payment.sponsorName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <a
                          href={`/dashboard/deals/${payment.dealId}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {payment.dealTitle}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="px-4 py-3">
                        <DueDateCell dueDate={payment.dueDate} status={payment.status} />
                      </td>
                      <td className="px-4 py-3">
                        {payment.status === "pending" || payment.status === "overdue" ? (
                          <Button
                            variant="primary"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => handleRecordPayment(payment.id)}
                            disabled={recordingId === payment.id}
                          >
                            {recordingId === payment.id ? "Recording..." : "Record Payment"}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
