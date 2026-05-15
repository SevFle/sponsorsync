"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DealCard, type DealCardDeal } from "@/components/ui/deal-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DealCardSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type FilterTab = "all" | "active" | "draft" | "proposed" | "completed" | "cancelled";

type SortOption =
  | "endDate-asc"
  | "endDate-desc"
  | "totalValue-desc"
  | "totalValue-asc"
  | "sponsorName-asc"
  | "sponsorName-desc"
  | "status-asc";

interface DealsResponse {
  deals: DealCardDeal[];
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Deals" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "proposed", label: "Proposed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "endDate-asc", label: "Deadline (nearest)" },
  { value: "endDate-desc", label: "Deadline (farthest)" },
  { value: "totalValue-desc", label: "Value (high to low)" },
  { value: "totalValue-asc", label: "Value (low to high)" },
  { value: "sponsorName-asc", label: "Sponsor (A-Z)" },
  { value: "sponsorName-desc", label: "Sponsor (Z-A)" },
  { value: "status-asc", label: "Status (A-Z)" },
];

function sortDeals(deals: DealCardDeal[], sort: SortOption): DealCardDeal[] {
  const sorted = [...deals];
  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const mult = dir === "desc" ? -1 : 1;

  sorted.sort((a, b) => {
    switch (field) {
      case "endDate": {
        const aT = a.endDate ? new Date(a.endDate).getTime() : null;
        const bT = b.endDate ? new Date(b.endDate).getTime() : null;
        if (aT === null && bT === null) return 0;
        if (aT === null) return 1;
        if (bT === null) return -1;
        return mult * (aT - bT);
      }
      case "totalValue":
        return mult * ((a.totalValue ?? 0) - (b.totalValue ?? 0));
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

export default function DealsPage() {
  const { isAuthenticated } = useAuth();

  const [deals, setDeals] = useState<DealCardDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOption>("endDate-asc");

  const fetchDeals = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<DealsResponse>("/api/deals", { signal });
      setDeals(data.deals ?? []);
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
    fetchDeals(controller.signal);
    return () => controller.abort();
  }, [fetchDeals, isAuthenticated]);

  const filteredDeals = deals.filter((deal) => {
    const matchesTab = activeTab === "all" || deal.status === activeTab;
    const query = search.toLowerCase();
    const matchesSearch =
      query === "" ||
      deal.sponsorName.toLowerCase().includes(query) ||
      deal.title.toLowerCase().includes(query) ||
      deal.status.toLowerCase().includes(query) ||
      (deal.description?.toLowerCase().includes(query) ?? false);
    return matchesTab && matchesSearch;
  });

  const sortedFilteredDeals = sortDeals(filteredDeals, sort);
  const hasFilters = search !== "" || activeTab !== "all";

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Manage your sponsorship deals."
        action={
          <div className="flex gap-2">
            <a
              href="/dashboard/deals/pipeline"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Pipeline View
            </a>
            <a
              href="/dashboard/deals/new"
              className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              New Deal
            </a>
          </div>
        }
      />

      <div className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Search deals by sponsor, status, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort deals"
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
          Array.from({ length: 4 }).map((_, i) => <DealCardSkeleton key={i} />)
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchDeals()}
              className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : sortedFilteredDeals.length === 0 ? (
          <EmptyState
            message={hasFilters ? "No deals match your filters" : "No deals yet"}
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Create your first deal to get started."
            }
          />
        ) : (
          sortedFilteredDeals.map((deal) => (
            <a
              key={deal.id}
              href={`/dashboard/deals/${deal.id}`}
              className="block"
            >
              <DealCard deal={deal} />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
