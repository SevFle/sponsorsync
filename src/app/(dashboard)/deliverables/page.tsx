"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { differenceInDays, isPast, startOfDay } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DeliverableCardSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type DeliverableStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "verified"
  | "missed";

type FilterTab = "all" | DeliverableStatus;

type SortOption =
  | "dueDate-asc"
  | "dueDate-desc"
  | "status-asc"
  | "status-desc"
  | "sponsorName-asc"
  | "sponsorName-desc";

export interface DeliverableItem {
  id: string;
  dealId: string;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  dueDate: string | null;
  completedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sponsorName: string;
  sponsorId: string;
  dealTitle: string;
}

interface DeliverablesResponse {
  deliverables: DeliverableItem[];
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
  { key: "verified", label: "Verified" },
  { key: "missed", label: "Missed" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "dueDate-asc", label: "Deadline (nearest)" },
  { value: "dueDate-desc", label: "Deadline (farthest)" },
  { value: "status-asc", label: "Status (A-Z)" },
  { value: "status-desc", label: "Status (Z-A)" },
  { value: "sponsorName-asc", label: "Sponsor (A-Z)" },
  { value: "sponsorName-desc", label: "Sponsor (Z-A)" },
];

const statusBadgeConfig: Record<
  DeliverableStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700",
  },
  submitted: {
    label: "Submitted",
    className: "bg-purple-100 text-purple-700",
  },
  verified: {
    label: "Verified",
    className: "bg-green-100 text-green-700",
  },
  missed: {
    label: "Missed",
    className: "bg-red-100 text-red-700",
  },
};

function DeliverableStatusBadge({
  status,
  className,
}: {
  status: DeliverableStatus;
  className?: string;
}) {
  const config = statusBadgeConfig[status];
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

function getDeadlineIndicator(dueDate: string | null, status: DeliverableStatus) {
  if (!dueDate) return null;
  if (status === "verified" || status === "submitted") return null;

  const date = new Date(dueDate);
  const daysUntil = differenceInDays(startOfDay(date), startOfDay(new Date()));
  const overdue = isPast(date);

  if (overdue) {
    return {
      text: `Overdue (${Math.abs(daysUntil)}d)`,
      className: "text-red-600 bg-red-50",
      dotColor: "bg-red-500",
    };
  }
  if (daysUntil <= 3) {
    return {
      text: daysUntil === 0 ? "Due today" : `${daysUntil}d left`,
      className: "text-amber-600 bg-amber-50",
      dotColor: "bg-amber-500",
    };
  }
  return {
    text: `${daysUntil}d left`,
    className: "text-gray-500 bg-gray-50",
    dotColor: "bg-gray-400",
  };
}

function sortDeliverables(
  deliverables: DeliverableItem[],
  sort: SortOption
): DeliverableItem[] {
  const sorted = [...deliverables];
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
      case "status":
        return mult * a.status.localeCompare(b.status);
      case "sponsorName":
        return mult * a.sponsorName.localeCompare(b.sponsorName);
      default:
        return 0;
    }
  });

  return sorted;
}

function DeliverableCard({ deliverable }: { deliverable: DeliverableItem }) {
  const deadline = getDeadlineIndicator(deliverable.dueDate, deliverable.status);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {deliverable.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {deliverable.dealTitle}
          </p>
        </div>
        <DeliverableStatusBadge status={deliverable.status} />
      </div>

      {deliverable.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
          {deliverable.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/sponsors/${deliverable.sponsorId}`}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 transition-colors hover:bg-gray-200"
          >
            {deliverable.sponsorName}
          </a>
        </div>

        {deadline && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              deadline.className
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", deadline.dotColor)}
            />
            {deadline.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DeliverablesPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();

  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOption>("dueDate-asc");

  const fetchDeliverables = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<DeliverablesResponse>("/api/deliverables", {
        signal,
      });
      setDeliverables(data.deliverables ?? []);
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
    fetchDeliverables(controller.signal);
    return () => controller.abort();
  }, [fetchDeliverables, sessionStatus, router]);

  const filteredDeliverables = deliverables.filter((d) => {
    const matchesTab = activeTab === "all" || d.status === activeTab;
    const query = search.toLowerCase();
    const matchesSearch =
      query === "" ||
      d.title.toLowerCase().includes(query) ||
      d.sponsorName.toLowerCase().includes(query) ||
      d.dealTitle.toLowerCase().includes(query) ||
      d.status.toLowerCase().includes(query) ||
      (d.description?.toLowerCase().includes(query) ?? false);
    return matchesTab && matchesSearch;
  });

  const sortedFilteredDeliverables = sortDeliverables(filteredDeliverables, sort);
  const hasFilters = search !== "" || activeTab !== "all";

  if (sessionStatus !== "authenticated") {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Deliverables"
        description="Track and manage your sponsorship deliverables."
      />

      <div className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Search deliverables by title, sponsor, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort deliverables"
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
          Array.from({ length: 4 }).map((_, i) => (
            <DeliverableCardSkeleton key={i} />
          ))
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchDeliverables()}
              className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : sortedFilteredDeliverables.length === 0 ? (
          <EmptyState
            message={
              hasFilters
                ? "No deliverables match your filters"
                : "No deliverables yet"
            }
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Deliverables will appear here when you create deals with deliverables."
            }
          />
        ) : (
          sortedFilteredDeliverables.map((deliverable) => (
            <DeliverableCard
              key={deliverable.id}
              deliverable={deliverable}
            />
          ))
        )}
      </div>
    </div>
  );
}
