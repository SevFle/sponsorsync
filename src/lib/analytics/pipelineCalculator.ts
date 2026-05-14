export interface DealLike {
  status: string;
  totalValue: number | null;
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
  percentage: number;
}

export interface PipelineSummary {
  stages: PipelineStage[];
  totalDeals: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
}

const STAGE_ORDER = ["draft", "active", "completed", "cancelled"] as const;

const STAGE_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STAGE_WEIGHTS: Record<string, number> = {
  draft: 0.2,
  active: 0.6,
  completed: 1.0,
  cancelled: 0,
};

export function computePipelineStages(deals: DealLike[]): PipelineStage[] {
  const total = deals.length || 1;

  return STAGE_ORDER.map((stage) => {
    const stageDeals = deals.filter((d) => d.status === stage);
    const count = stageDeals.length;
    const value = stageDeals.reduce((sum, d) => sum + (d.totalValue ?? 0), 0);

    return {
      stage,
      count,
      value,
      percentage: Math.round((count / total) * 100),
    };
  });
}

export function computePipelineSummary(deals: DealLike[]): PipelineSummary {
  const stages = computePipelineStages(deals);
  const totalDeals = deals.length;
  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.totalValue ?? 0), 0);
  const weightedPipelineValue = deals.reduce((sum, d) => {
    const weight = STAGE_WEIGHTS[d.status] ?? 0;
    return sum + (d.totalValue ?? 0) * weight;
  }, 0);

  return {
    stages,
    totalDeals,
    totalPipelineValue,
    weightedPipelineValue: Math.round(weightedPipelineValue),
  };
}

export function getStageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

export function getStageColor(stage: string): string {
  switch (stage) {
    case "draft":
      return "#f59e0b";
    case "active":
      return "#3b82f6";
    case "completed":
      return "#10b981";
    case "cancelled":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}
