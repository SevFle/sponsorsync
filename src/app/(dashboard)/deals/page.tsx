"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DealCard, type DealCardDeal } from "@/components/ui/deal-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DealCardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "active" | "draft" | "completed" | "cancelled";

interface DealsResponse {
  deals: DealCardDeal[];
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Deals" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<DealCardDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchDeals = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/deals", { signal });
      if (!res.ok) throw new Error("Failed to fetch deals");
      const data: DealsResponse = await res.json();
      setDeals(data.deals ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDeals(controller.signal);
    return () => controller.abort();
  }, [fetchDeals]);

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

  const hasFilters = search !== "" || activeTab !== "all";

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Manage your sponsorship deals."
        action={
          <a
            href="/dashboard/deals/new"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            New Deal
          </a>
        }
      />

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search deals by sponsor, status, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
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
        ) : filteredDeals.length === 0 ? (
          <EmptyState
            message={hasFilters ? "No deals match your filters" : "No deals yet"}
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Create your first deal to get started."
            }
          />
        ) : (
          filteredDeals.map((deal) => (
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
