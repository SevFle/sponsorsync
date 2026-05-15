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

interface AnalyticsResponse {
  revenue: RevenueSummary;
  pipeline: PipelineSummary;
  deliverables: DeliverableMetricsResult;
  trends: TrendSummary;
}

interface AnalyticsState extends AnalyticsData {
  isLoading: boolean;
  error: string | null;
}

export function useAnalytics(range: DateRangePreset, enabled = true) {
  const [state, setState] = useState<AnalyticsState>({
    revenue: null,
    pipeline: null,
    deliverables: null,
    trends: null,
    isLoading: enabled,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await apiFetch<AnalyticsResponse>(
        `/api/analytics?range=${range}`
      );

      setState({
        revenue: data.revenue,
        pipeline: data.pipeline,
        deliverables: data.deliverables,
        trends: data.trends,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [range]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
  }, [fetchData, enabled]);

  return { ...state, refetch: fetchData };
}
