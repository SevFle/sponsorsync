import { type DeliverableVerificationReport, type VerificationContext, type VerificationStatus } from "@/lib/deliverables/types";
import { checkEpisodeDeliverable, batchCheckEpisodes, type EpisodeCheckResult, type EpisodeData, type DeliverableRequirement } from "./episodeChecker";
import { type VerificationAction } from "./verificationNotifier";
import { createAuditEntry, type VerificationAuditEntry, summarizeAuditEntries, type BulkVerificationAuditSummary } from "./verificationAuditLog";

export interface EnhancedVerificationResult {
  baseReport: DeliverableVerificationReport;
  episodeCheck: EpisodeCheckResult | null;
  confidence: number;
  recommendedAction: VerificationAction;
  auditEntry: VerificationAuditEntry;
}

export interface EnhancedBulkResult extends BulkVerificationAuditSummary {
  results: EnhancedVerificationResult[];
  errors: string[];
}

export function computeEnhancedVerification(
  baseReport: DeliverableVerificationReport,
  episodes: EpisodeData[],
  requirement: DeliverableRequirement,
  userId: string
): EnhancedVerificationResult {
  const episodeCheck = episodes.length > 0
    ? checkEpisodeDeliverable(episodes, requirement)
    : null;

  let confidence = 0;
  let recommendedAction: VerificationAction = "verification_failed";

  if (episodeCheck) {
    confidence = episodeCheck.overallConfidence;
    recommendedAction = episodeCheck.recommendation as VerificationAction;
  } else {
    if (baseReport.overallStatus === "pass") {
      confidence = 0.9;
      recommendedAction = "auto_complete";
    } else if (baseReport.overallStatus === "pending") {
      confidence = 0.2;
      recommendedAction = "verification_failed";
    } else {
      confidence = 0.1;
      recommendedAction = "verification_failed";
    }

    if (baseReport.deadlineStatus === "overdue") {
      recommendedAction = "overdue_alert";
    }
  }

  const keywordMatchCount = episodeCheck?.keywordMatch?.matchedKeywords.length ?? 0;
  const keywordTotalCount = episodeCheck?.keywordMatch?.totalKeywords ?? 0;

  const auditEntry = createAuditEntry({
    deliverableId: baseReport.deliverableId,
    dealId: baseReport.dealId,
    userId,
    episodeId: episodeCheck?.episodeId ?? null,
    action: recommendedAction,
    confidence,
    placement: episodeCheck?.timestampAnalysis?.placement ?? null,
    keywordMatchCount,
    keywordTotalCount,
    previousStatus: baseReport.overallStatus,
    newStatus: recommendedAction === "auto_complete" ? "verified" : null,
    metadata: {
      baseStatus: baseReport.overallStatus,
      deadlineStatus: baseReport.deadlineStatus,
      checksCount: baseReport.checks.length,
    },
  });

  return {
    baseReport,
    episodeCheck,
    confidence,
    recommendedAction,
    auditEntry,
  };
}

export function computeEnhancedBulkVerification(
  baseReports: DeliverableVerificationReport[],
  episodeDeliverablePairs: {
    deliverableId: string;
    episodes: EpisodeData[];
    requirement: DeliverableRequirement;
  }[],
  userId: string
): EnhancedBulkResult {
  const results: EnhancedVerificationResult[] = [];
  const errors: string[] = [];

  const episodeMap = new Map(
    episodeDeliverablePairs.map((p) => [p.deliverableId, p])
  );

  for (const report of baseReports) {
    try {
      const pair = episodeMap.get(report.deliverableId);
      const episodes = pair?.episodes ?? [];
      const requirement = pair?.requirement ?? {
        id: report.deliverableId,
        title: report.deliverableTitle,
        sponsorName: "",
        requiredPlacement: null,
        dueDate: report.dueDate,
      };

      const enhanced = computeEnhancedVerification(report, episodes, requirement, userId);
      results.push(enhanced);
    } catch (error) {
      errors.push(
        `Error computing enhanced verification for ${report.deliverableId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  const auditEntries = results.map((r) => r.auditEntry);
  const summary = summarizeAuditEntries(auditEntries);

  return {
    ...summary,
    results,
    errors,
  };
}

export function getStatusTransition(
  currentStatus: string,
  recommendedAction: VerificationAction
): string | null {
  switch (recommendedAction) {
    case "auto_complete":
      return "verified";
    case "manual_review":
      return currentStatus === "verified" ? null : "in_progress";
    case "overdue_alert":
      return currentStatus === "missed" ? null : "missed";
    default:
      return null;
  }
}
