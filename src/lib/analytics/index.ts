export {
  resolveDateRange,
  isInRange,
  formatMonthKey,
  formatWeekKey,
  formatDayKey,
  getMonthRange,
  getWeekRange,
  parseFlexibleDate,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  type DateRange,
} from "./dateRangeHelper";

export {
  aggregateRevenueByMonth,
  computeRevenueSummary,
  type PaymentLike as AnalyticsPaymentLike,
  type MonthlyRevenue,
  type RevenueSummary,
} from "./revenueAggregator";

export {
  computePipelineStages,
  computePipelineSummary,
  getStageLabel,
  getStageColor,
  type DealLike as AnalyticsDealLike,
  type PipelineStage,
  type PipelineSummary,
} from "./pipelineCalculator";

export {
  computeStatusCounts,
  computeDeliverableMetrics,
  getStatusColor,
  type DeliverableLike as AnalyticsDeliverableLike,
  type DeliverableStatusCounts,
  type DeliverableMetricsResult,
} from "./deliverableMetrics";

export {
  analyzeRevenueTrend,
  analyzeDealTrend,
  analyzeCompletionTrend,
  computeTrendSummary,
  type TrendGranularity,
  type TrendPoint,
  type TrendData,
  type TrendSummary,
} from "./trendAnalyzer";
