"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateList, type TemplateListItem } from "@/components/templates/TemplateList";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";

interface TemplatesResponse {
  templates: TemplateListItem[];
}

export default function TemplatesPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchTemplates = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const data = await apiFetch<TemplatesResponse>("/api/templates", {
        signal,
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      setTemplates(data.templates ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (sessionStatus !== "authenticated") return;

    const controller = new AbortController();
    fetchTemplates(controller.signal);
    return () => controller.abort();
  }, [fetchTemplates, sessionStatus, router]);

  const handleSelect = (id: string) => {
    router.push(`/dashboard/templates/${id}`);
  };

  if (sessionStatus !== "authenticated") {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Manage your sponsor communication email templates."
        action={
          <a
            href="/dashboard/templates/new"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            New Template
          </a>
        }
      />

      <div className="mt-6">
        {loading && !templates.length ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-4">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchTemplates()}
              className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <TemplateList
            templates={templates}
            onSelect={handleSelect}
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
          />
        )}
      </div>
    </div>
  );
}
