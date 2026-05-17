"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StatusBadge, type DealStatus } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { format } from "date-fns";

interface Sponsor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SponsorDeal {
  id: string;
  title: string;
  description: string | null;
  status: DealStatus;
  totalValue: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SponsorDetailResponse {
  sponsor: Sponsor;
  deals: SponsorDeal[];
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SponsorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [deals, setDeals] = useState<SponsorDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    params.then((p) => setResolvedId(p.id));
  }, [params]);

  const fetchSponsor = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<SponsorDetailResponse>(`/api/sponsors/${id}`, { signal });
      setSponsor(data.sponsor);
      setDeals(data.deals ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      const currentPath = window.location.pathname;
      router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (sessionStatus !== "authenticated" || !resolvedId) return;

    const controller = new AbortController();
    fetchSponsor(resolvedId, controller.signal);
    return () => controller.abort();
  }, [fetchSponsor, sessionStatus, router, resolvedId]);

  const handleDelete = async () => {
    if (!resolvedId || !confirm("Are you sure you want to delete this sponsor? This action cannot be undone.")) return;
    try {
      setDeleting(true);
      await apiFetch(`/api/sponsors/${resolvedId}`, { method: "DELETE" });
      router.replace("/dashboard/sponsors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sponsor");
      setDeleting(false);
    }
  };

  if (sessionStatus !== "authenticated" || !resolvedId) {
    return null;
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !sponsor) {
    return (
      <div>
        <a href="/dashboard/sponsors" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Sponsors
        </a>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button
            onClick={() => resolvedId && fetchSponsor(resolvedId)}
            className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!sponsor) return null;

  return (
    <div>
      <div className="flex items-center gap-4">
        <a href="/dashboard/sponsors" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Sponsors
        </a>
      </div>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{sponsor.name}</h1>
          {sponsor.company && (
            <p className="mt-1 text-sm text-gray-500">{sponsor.company}</p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={`/dashboard/sponsors/${sponsor.id}/communications`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Communications
          </a>
          <a
            href={`/dashboard/sponsors/${sponsor.id}/edit`}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
          >
            Edit
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>
            <dl className="mt-3 space-y-3">
              {sponsor.email && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Email</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">
                    <a href={`mailto:${sponsor.email}`} className="text-blue-600 hover:text-blue-800">
                      {sponsor.email}
                    </a>
                  </dd>
                </div>
              )}
              {sponsor.phone && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Phone</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">
                    <a href={`tel:${sponsor.phone}`} className="text-blue-600 hover:text-blue-800">
                      {sponsor.phone}
                    </a>
                  </dd>
                </div>
              )}
              {!sponsor.email && !sponsor.phone && (
                <p className="text-sm text-gray-400">No contact info added.</p>
              )}
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
            <div className="mt-3">
              {sponsor.notes ? (
                <p className="whitespace-pre-wrap text-sm text-gray-700">{sponsor.notes}</p>
              ) : (
                <p className="text-sm text-gray-400">No notes added.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Deal History ({deals.length})
            </h2>
            <a
              href={`/dashboard/deals/new?sponsorId=${sponsor.id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Add Deal
            </a>
          </div>

          {deals.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-900">No deals yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Create a deal with this sponsor to get started.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {deals.map((deal) => (
                <a
                  key={deal.id}
                  href={`/dashboard/deals/${deal.id}`}
                  className="block rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-gray-900">
                        {deal.title}
                      </h3>
                      {deal.description && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {deal.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {deal.totalValue != null && (
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(deal.totalValue, deal.currency)}
                        </span>
                      )}
                      <StatusBadge status={deal.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    {deal.startDate && (
                      <span>{format(new Date(deal.startDate), "MMM d, yyyy")}</span>
                    )}
                    {deal.startDate && deal.endDate && <span>&ndash;</span>}
                    {deal.endDate && (
                      <span>{format(new Date(deal.endDate), "MMM d, yyyy")}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
