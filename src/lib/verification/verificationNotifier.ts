import type { EpisodeCheckResult } from "./episodeChecker";
import type { DeliverableVerificationReport } from "@/lib/deliverables/types";

export type VerificationAction =
  | "auto_complete"
  | "manual_review"
  | "overdue_alert"
  | "verification_failed"
  | "verification_passed";

export interface VerificationNotification {
  userId: string;
  deliverableId: string;
  dealId: string | null;
  action: VerificationAction;
  confidence: number;
  title: string;
  message: string;
  episodeTitle: string | null;
  deliverableTitle: string;
}

const AUTO_COMPLETE_THRESHOLD = 0.85;
const MANUAL_REVIEW_THRESHOLD = 0.5;

export function determineVerificationAction(
  confidence: number,
  isOverdue: boolean,
  hasEpisode: boolean
): VerificationAction {
  if (isOverdue && !hasEpisode) {
    return "overdue_alert";
  }
  if (confidence >= AUTO_COMPLETE_THRESHOLD) {
    return "auto_complete";
  }
  if (confidence >= MANUAL_REVIEW_THRESHOLD) {
    return "manual_review";
  }
  if (confidence > 0) {
    return "verification_failed";
  }
  return "verification_failed";
}

export function buildVerificationNotification(
  userId: string,
  episodeResult: EpisodeCheckResult,
  dealId: string | null,
  dealTitle: string | null
): VerificationNotification {
  const isOverdue = episodeResult.recommendation === "overdue_no_episode";
  const hasEpisode = episodeResult.episodeId !== null;
  const action = determineVerificationAction(
    episodeResult.overallConfidence,
    isOverdue,
    hasEpisode
  );

  const confidencePercent = Math.round(episodeResult.overallConfidence * 100);
  let title: string;
  let message: string;

  switch (action) {
    case "auto_complete":
      title = "Deliverable Auto-Verified";
      message = `"${episodeResult.summary.split('"')[1] || "Deliverable"}" has been automatically verified with ${confidencePercent}% confidence for deal "${dealTitle || "Unknown"}".`;
      break;
    case "manual_review":
      title = "Manual Review Required";
      message = `"${episodeResult.summary.split('"')[1] || "Deliverable"}" matched with ${confidencePercent}% confidence and needs your review for deal "${dealTitle || "Unknown"}".`;
      break;
    case "overdue_alert":
      title = "Overdue Deliverable — No Episode Found";
      message = `Deliverable "${episodeResult.summary.split('"')[1] || "Unknown"}" is overdue and no matching episode was found. Deal: "${dealTitle || "Unknown"}".`;
      break;
    case "verification_failed":
      title = "Verification Failed";
      message = `Could not verify deliverable for deal "${dealTitle || "Unknown"}". Confidence: ${confidencePercent}%. Manual review recommended.`;
      break;
    case "verification_passed":
      title = "Verification Passed";
      message = `Deliverable verification passed with ${confidencePercent}% confidence for deal "${dealTitle || "Unknown"}".`;
      break;
  }

  return {
    userId,
    deliverableId: episodeResult.deliverableId,
    dealId,
    action,
    confidence: episodeResult.overallConfidence,
    title,
    message,
    episodeTitle: episodeResult.episodeId ? episodeResult.summary.split('"')[1] || null : null,
    deliverableTitle: episodeResult.summary.split('"')[3] || episodeResult.deliverableId,
  };
}

export function buildBulkVerificationNotifications(
  userId: string,
  results: EpisodeCheckResult[],
  dealMap: Map<string, string>
): VerificationNotification[] {
  const notifications: VerificationNotification[] = [];

  for (const result of results) {
    const dealId = result.deliverableId;
    const dealTitle = dealMap.get(result.deliverableId) ?? null;
    const notification = buildVerificationNotification(userId, result, dealId, dealTitle);
    notifications.push(notification);
  }

  return notifications;
}

export function shouldAutoComplete(confidence: number): boolean {
  return confidence >= AUTO_COMPLETE_THRESHOLD;
}

export function shouldManualReview(confidence: number): boolean {
  return confidence >= MANUAL_REVIEW_THRESHOLD && confidence < AUTO_COMPLETE_THRESHOLD;
}
