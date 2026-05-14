"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { DateRangePreset, RevenueSummary, PipelineSummary, DeliverableMetricsResult, TrendSummary } from "@/lib/analytics";

interface AnalyticsData {
  revenue: RevenueSummary | null;
  pipeline: PipelineSummary | null;
  deliverables: DeliverableMetricsResult | null;
  trends: TrendSummary | null;
}

interface AnalyticsState extends AnalyticsData {
  isLoading: boolean;
  error: string | null;
}

export function useAnalytics(range: DateRangePreset) {
  const [state, setState] = useState<AnalyticsState>({
    revenue: null,
    pipeline: null,
    deliverables: null,
    trends: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [revenue, pipeline, deliverables, trends] = await Promise.all([
        apiFetch<RevenueSummary>(`/api/analytics/revenue?range=${range}`),
        apiFetch<PipelineSummary>("/api/analytics/pipeline"),
        apiFetch<DeliverableMetricsResult>(`/api/analytics/deliverables?range=${range}`),
        apiFetch<TrendSummary>("/api/analytics/trends"),
      ]);

      setState({ revenue, pipeline, deliverables, trends, isLoading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
