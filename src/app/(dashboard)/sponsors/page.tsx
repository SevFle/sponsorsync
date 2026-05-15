"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SponsorCard, type SponsorCardSponsor } from "@/components/ui/sponsor-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SponsorCardSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type SortOption =
  | "name-asc"
  | "name-desc"
  | "company-asc"
  | "company-desc"
  | "activeDealCount-desc"
  | "activeDealCount-asc"
  | "createdAt-desc"
  | "createdAt-asc";

interface SponsorsResponse {
  sponsors: SponsorCardSponsor[];
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "company-asc", label: "Company (A-Z)" },
  { value: "company-desc", label: "Company (Z-A)" },
  { value: "activeDealCount-desc", label: "Most active deals" },
  { value: "activeDealCount-asc", label: "Fewest active deals" },
  { value: "createdAt-desc", label: "Newest first" },
  { value: "createdAt-asc", label: "Oldest first" },
];

function sortSponsors(sponsors: SponsorCardSponsor[], sort: SortOption): SponsorCardSponsor[] {
  const sorted = [...sponsors];
  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const mult = dir === "desc" ? -1 : 1;

  sorted.sort((a, b) => {
    switch (field) {
      case "name":
        return mult * a.name.localeCompare(b.name);
      case "company":
        return mult * (a.company ?? "").localeCompare(b.company ?? "");
      case "activeDealCount":
        return mult * (a.activeDealCount - b.activeDealCount);
      case "createdAt": {
        const aT = new Date(a.createdAt).getTime();
        const bT = new Date(b.createdAt).getTime();
        return mult * (aT - bT);
      }
      default:
        return 0;
    }
  });

  return sorted;
}

export default function SponsorsPage() {
  const { isAuthenticated } = useAuth();

  const [sponsors, setSponsors] = useState<SponsorCardSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name-asc");

  const fetchSponsors = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<SponsorsResponse>("/api/sponsors", { signal });
      setSponsors(data.sponsors ?? []);
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
    fetchSponsors(controller.signal);
    return () => controller.abort();
  }, [fetchSponsors, isAuthenticated]);

  const query = search.toLowerCase();
  const filteredSponsors = sponsors.filter((sponsor) => {
    if (query === "") return true;
    return (
      sponsor.name.toLowerCase().includes(query) ||
      (sponsor.company?.toLowerCase().includes(query) ?? false) ||
      (sponsor.email?.toLowerCase().includes(query) ?? false) ||
      (sponsor.phone?.toLowerCase().includes(query) ?? false)
    );
  });

  const sortedFilteredSponsors = sortSponsors(filteredSponsors, sort);
  const hasFilters = search !== "";

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Sponsors"
        description="Manage your sponsor contacts."
        action={
          <a
            href="/dashboard/sponsors/new"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            New Sponsor
          </a>
        }
      />

      <div className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Search sponsors by name, company, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort sponsors"
          className="rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SponsorCardSkeleton key={i} />)
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchSponsors()}
              className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : sortedFilteredSponsors.length === 0 ? (
          <EmptyState
            message={hasFilters ? "No sponsors match your search" : "No sponsors yet"}
            description={
              hasFilters
                ? "Try adjusting your search."
                : "Add your first sponsor to get started."
            }
          />
        ) : (
          sortedFilteredSponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={`/dashboard/sponsors/${sponsor.id}`}
              className="block"
            >
              <SponsorCard sponsor={sponsor} />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
