export {
  matchKeywords,
  detectSponsorRead,
  computeKeywordConfidence,
  type KeywordMatchResult,
  type KeywordMatchOptions,
} from "./keywordMatcher";

export {
  analyzeTimestamps,
  isPlacementCorrect,
  type PlacementType,
  type TimestampAnalysis,
  type TimestampAnalysisInput,
} from "./timestampAnalyzer";

export {
  checkEpisodeDeliverable,
  batchCheckEpisodes,
  type EpisodeData,
  type DeliverableRequirement,
  type EpisodeCheckResult,
} from "./episodeChecker";

export {
  determineVerificationAction,
  buildVerificationNotification,
  buildBulkVerificationNotifications,
  shouldAutoComplete,
  shouldManualReview,
  type VerificationAction,
  type VerificationNotification,
} from "./verificationNotifier";

export {
  createAuditEntry,
  summarizeAuditEntries,
  formatAuditEntry,
  resetAuditCounter,
  type VerificationAuditEntry,
  type BulkVerificationAuditSummary,
} from "./verificationAuditLog";

export {
  computeEnhancedVerification,
  computeEnhancedBulkVerification,
  getStatusTransition,
  type EnhancedVerificationResult,
  type EnhancedBulkResult,
} from "./enhancedVerification";
