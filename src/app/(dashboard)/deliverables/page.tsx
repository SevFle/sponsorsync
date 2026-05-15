"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import {
  DeliverableStatusBadge,
  type DeliverableStatus,
} from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type FilterTab = "all" | DeliverableStatus;

type DeadlineStatus =
  | "on_track"
  | "at_risk"
  | "overdue"
  | "completed"
  | "no_deadline";

type VerificationLabel =
  | "Not Started"
  | "Draft"
  | "Recording"
  | "Pending Review"
  | "Awaiting"
  | "Approved"
  | "Failed";

type PlatformSyncStatus = "synced" | "pending";

interface Deliverable {
  id: string;
  dealId: string;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  dueDate: string | null;
  completedDate: string | null;
  verificationData: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  dealTitle: string;
  sponsorName: string;
  deadlineStatus: DeadlineStatus;
}

interface DeliverablesMetrics {
  total: number;
  completionRate: number;
  onTimeRate: number;
  overdueCount: number;
  verifiedCount: number;
  statusCounts: Record<DeliverableStatus, number>;
}

interface DeliverablesResponse {
  deliverables: Deliverable[];
  metrics: DeliverablesMetrics;
}

type SortOption =
  | "dueDate-asc"
  | "dueDate-desc"
  | "status-asc"
  | "sponsorName-asc"
  | "sponsorName-desc"
  | "title-asc";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
  { key: "verified", label: "Verified" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "dueDate-asc", label: "Due date (nearest)" },
  { value: "dueDate-desc", label: "Due date (farthest)" },
  { value: "status-asc", label: "Status (A-Z)" },
  { value: "sponsorName-asc", label: "Sponsor (A-Z)" },
  { value: "sponsorName-desc", label: "Sponsor (Z-A)" },
  { value: "title-asc", label: "Title (A-Z)" },
];

function sortDeliverables(
  deliverables: Deliverable[],
  sort: SortOption
): Deliverable[] {
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
      case "title":
        return mult * a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return sorted;
}

function getVerificationLabel(d: Deliverable): VerificationLabel {
  if (d.status === "verified") return "Approved";
  if (d.status === "submitted") return "Awaiting";
  if (d.status === "in_progress") {
    const vd = d.verificationData;
    if (vd && typeof vd.recordingStarted === "boolean" && vd.recordingStarted)
      return "Recording";
    return "Draft";
  }
  if (d.status === "missed") return "Failed";
  return "Not Started";
}

function getSyncStatus(d: Deliverable): PlatformSyncStatus {
  const vd = d.verificationData;
  if (vd && typeof vd.platformSynced === "boolean" && vd.platformSynced)
    return "synced";
  return "pending";
}

function getVerificationColor(label: VerificationLabel): string {
  switch (label) {
    case "Approved":
      return "bg-green-50 text-green-700";
    case "Awaiting":
    case "Pending Review":
    case "Recording":
    case "Draft":
      return "bg-orange-50 text-orange-700";
    case "Failed":
      return "bg-red-50 text-red-700";
    default:
      return "bg-orange-50 text-orange-700";
  }
}

function getDeadlineColor(deadlineStatus: DeadlineStatus): string {
  switch (deadlineStatus) {
    case "overdue":
      return "text-red-600 font-medium";
    case "at_risk":
      return "text-orange-600 font-medium";
    case "completed":
      return "text-gray-500";
    case "on_track":
      return "text-gray-600";
    default:
      return "text-gray-500";
  }
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "No deadline";
  return `Due: ${format(new Date(dueDate), "MMM d")}`;
}

function DeliverablesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded border border-gray-200 px-4 py-3"
        >
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

function MetricSummary({
  metrics,
}: {
  metrics: DeliverablesMetrics | null;
}) {
  if (!metrics) return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Total</p>
        <p className="text-lg font-bold text-gray-900">{metrics.total}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Overdue</p>
        <p className="text-lg font-bold text-red-600">
          {metrics.overdueCount}
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Verified</p>
        <p className="text-lg font-bold text-green-600">
          {metrics.verifiedCount}
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Completion</p>
        <p className="text-lg font-bold text-gray-900">
          {metrics.completionRate.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}

export default function DeliverablesPage() {
  const { isAuthenticated } = useAuth();

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [metrics, setMetrics] = useState<DeliverablesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOption>("dueDate-asc");

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<DeliverablesResponse>("/api/deliverables", {
        signal,
      });
      setDeliverables(data.deliverables ?? []);
      setMetrics(data.metrics ?? null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, isAuthenticated]);

  const filteredDeliverables = deliverables.filter((d) => {
    const matchesTab =
      activeTab === "all" || d.status === activeTab;
    const query = search.toLowerCase();
    const matchesSearch =
      query === "" ||
      d.title.toLowerCase().includes(query) ||
      d.sponsorName.toLowerCase().includes(query) ||
      d.dealTitle.toLowerCase().includes(query) ||
      d.status.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const sortedDeliverables = sortDeliverables(filteredDeliverables, sort);
  const hasFilters = search !== "" || activeTab !== "all";

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Deliverables"
        description="Calendar and kanban view of deliverables."
      />

      {!loading && metrics && <MetricSummary metrics={metrics} />}

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by title, sponsor, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      <div className="mt-6">
        {loading ? (
          <DeliverablesSkeleton />
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
        ) : sortedDeliverables.length === 0 ? (
          <EmptyState
            message={
              hasFilters
                ? "No deliverables match your filters"
                : "No deliverables yet"
            }
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Add deliverables to your deals to get started."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Deliverable
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sponsor
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Verification
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Platform Sync
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedDeliverables.map((d) => {
                  const verificationLabel = getVerificationLabel(d);
                  const syncStatus = getSyncStatus(d);
                  return (
                    <tr
                      key={d.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{d.title}</p>
                        {d.description && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {d.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.sponsorName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={getDeadlineColor(d.deadlineStatus)}>
                          {formatDueDate(d.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DeliverableStatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                            getVerificationColor(verificationLabel)
                          )}
                        >
                          {verificationLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {syncStatus === "synced" ? (
                          <span className="text-green-600">
                            &#10003; Synced
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            &#8635; Pending
                          </span>
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
