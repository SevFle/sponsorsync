"use client";

import { useState, useEffect, useCallback } from "react";
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
      const [revenueRes, pipelineRes, deliverablesRes, trendsRes] = await Promise.all([
        fetch(`/api/analytics/revenue?range=${range}`),
        fetch("/api/analytics/pipeline"),
        fetch(`/api/analytics/deliverables?range=${range}`),
        fetch("/api/analytics/trends"),
      ]);

      if (!revenueRes.ok || !pipelineRes.ok || !deliverablesRes.ok || !trendsRes.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const [revenue, pipeline, deliverables, trends] = await Promise.all([
        revenueRes.json(),
        pipelineRes.json(),
        deliverablesRes.json(),
        trendsRes.json(),
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
