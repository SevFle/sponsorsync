"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type { DealPipelineStatus } from "@/domain/deals";
import type { DealStatus } from "@/components/ui/status-badge";

interface PipelineDeal {
  id: string;
  sponsorName: string;
  title: string;
  description: string | null;
  status: DealStatus;
  totalValue: number | null;
  currency: string;
  endDate: string | null;
  progress: number;
}

interface DealsResponse {
  deals: PipelineDeal[];
}

const PIPELINE_COLUMNS: { status: DealPipelineStatus; label: string; headerColor: string }[] = [
  { status: "draft", label: "Draft", headerColor: "bg-amber-500" },
  { status: "proposed", label: "Proposed", headerColor: "bg-blue-500" },
  { status: "active", label: "Active", headerColor: "bg-green-500" },
  { status: "completed", label: "Completed", headerColor: "bg-slate-500" },
];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function PipelineDealCard({
  deal,
  onDragStart,
}: {
  deal: PipelineDeal;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-900">
            {deal.sponsorName}
          </h4>
          <p className="truncate text-xs text-gray-500">{deal.title}</p>
        </div>
        {deal.totalValue != null && (
          <span className="shrink-0 text-sm font-bold text-gray-900">
            {formatCurrency(deal.totalValue, deal.currency)}
          </span>
        )}
      </div>
      {deal.endDate && (
        <p className="mt-2 text-xs text-gray-400">
          Due {new Date(deal.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      )}
      {deal.progress > 0 && (
        <div className="mt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-400 transition-all"
              style={{ width: `${deal.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineColumn({
  status,
  label,
  headerColor,
  deals,
  onDragStart,
  onDragOver,
  onDrop,
  isOver,
}: {
  status: DealPipelineStatus;
  label: string;
  headerColor: string;
  deals: PipelineDeal[];
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: DealPipelineStatus) => void;
  isOver: boolean;
}) {
  return (
    <div className="flex min-w-[280px] flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${headerColor}`} />
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {deals.length}
        </span>
      </div>
      <div
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, status)}
        className={`flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"
        }`}
      >
        {deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-gray-400">Drop deals here</p>
          </div>
        ) : (
          deals.map((deal) => (
            <a key={deal.id} href={`/dashboard/deals/${deal.id}`}>
              <PipelineDealCard deal={deal} onDragStart={onDragStart} />
            </a>
          ))
        )}
      </div>
    </div>
  );
}

export default function DealPipelinePage() {
  const { isAuthenticated } = useAuth();

  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<DealPipelineStatus | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

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

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: DealPipelineStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const dealId = e.dataTransfer.getData("text/plain") || draggedDealId;
    if (!dealId) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.status === newStatus) return;

    const prevDeals = deals;
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d)));

    try {
      await apiFetch(`/api/deals/${dealId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setDeals(prevDeals);
      setError("Failed to update deal status. Please try again.");
    } finally {
      setDraggedDealId(null);
    }
  };

  if (!isAuthenticated) return null;

  const pipelineDeals = deals.filter((d) =>
    PIPELINE_COLUMNS.some((col) => col.status === d.status)
  );

  return (
    <div>
      <PageHeader
        title="Deal Pipeline"
        description="Drag and drop deals between stages to update their status."
        action={
          <a
            href="/dashboard/deals/new"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            New Deal
          </a>
        }
      />

      <div className="mt-2 mb-4">
        <a
          href="/dashboard/deals"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Back to list view
        </a>
      </div>

      {loading ? (
        <div className="flex gap-4">
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col.status} className="min-w-[280px] flex-1">
              <div className="mb-3 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${col.headerColor}`} />
                <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              </div>
              <div className="flex min-h-[200px] flex-col gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
                ))}
              </div>
            </div>
          ))}
        </div>
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
      ) : pipelineDeals.length === 0 ? (
        <EmptyState
          message="No deals in pipeline"
          description="Create your first deal to see it appear in the pipeline."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => (
            <PipelineColumn
              key={col.status}
              status={col.status}
              label={col.label}
              headerColor={col.headerColor}
              deals={deals.filter((d) => d.status === col.status)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isOver={dragOverColumn === col.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
