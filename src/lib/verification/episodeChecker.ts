import { matchKeywords, detectSponsorRead, type KeywordMatchResult } from "./keywordMatcher";
import { analyzeTimestamps, type PlacementType, type TimestampAnalysis } from "./timestampAnalyzer";

export interface EpisodeData {
  id: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  url: string | null;
  transcript: string | null;
}

export interface DeliverableRequirement {
  id: string;
  title: string;
  sponsorName: string;
  productName?: string | null;
  requiredPlacement: PlacementType | null;
  dueDate: string | null;
  keywords?: string[];
}

export interface EpisodeCheckResult {
  episodeId: string | null;
  deliverableId: string;
  overallConfidence: number;
  keywordMatch: KeywordMatchResult | null;
  timestampAnalysis: TimestampAnalysis | null;
  recommendation: "auto_complete" | "manual_review" | "not_found" | "overdue_no_episode";
  summary: string;
}

const AUTO_COMPLETE_THRESHOLD = 0.85;
const MANUAL_REVIEW_THRESHOLD = 0.5;

export function checkEpisodeDeliverable(
  episodes: EpisodeData[],
  requirement: DeliverableRequirement
): EpisodeCheckResult {
  if (requirement.dueDate && new Date(requirement.dueDate) < new Date() && episodes.length === 0) {
    return {
      episodeId: null,
      deliverableId: requirement.id,
      overallConfidence: 0,
      keywordMatch: null,
      timestampAnalysis: null,
      recommendation: "overdue_no_episode",
      summary: `Deliverable "${requirement.title}" is overdue with no matching episode published`,
    };
  }

  if (episodes.length === 0) {
    return {
      episodeId: null,
      deliverableId: requirement.id,
      overallConfidence: 0,
      keywordMatch: null,
      timestampAnalysis: null,
      recommendation: "not_found",
      summary: `No episodes found to verify deliverable "${requirement.title}"`,
    };
  }

  let bestResult: EpisodeCheckResult | null = null;
  let bestConfidence = -1;

  for (const episode of episodes) {
    const result = analyzeSingleEpisode(episode, requirement);
    if (result.overallConfidence > bestConfidence) {
      bestConfidence = result.overallConfidence;
      bestResult = result;
    }
  }

  return bestResult!;
}

function analyzeSingleEpisode(
  episode: EpisodeData,
  requirement: DeliverableRequirement
): EpisodeCheckResult {
  let keywordMatch: KeywordMatchResult | null = null;
  let timestampAnalysis: TimestampAnalysis | null = null;

  if (episode.transcript) {
    keywordMatch = detectSponsorRead(
      episode.transcript,
      requirement.sponsorName,
      requirement.productName ?? undefined
    );

    if (requirement.keywords && requirement.keywords.length > 0) {
      const additionalMatch = matchKeywords(episode.transcript, requirement.keywords);
      if (additionalMatch.confidence > keywordMatch.confidence) {
        keywordMatch = additionalMatch;
      }
    }
  }

  if (episode.durationSeconds && episode.durationSeconds > 0) {
    const adTimestamp = extractAdTimestamp(episode, requirement);
    timestampAnalysis = analyzeTimestamps({
      adTimestampSeconds: adTimestamp,
      episodeDurationSeconds: episode.durationSeconds,
      requiredPlacement: requirement.requiredPlacement,
      episodeTotalSegments: null,
      adSegmentIndex: null,
    });
  }

  let confidence = 0;
  let confidenceFactors = 0;

  if (keywordMatch) {
    confidence += keywordMatch.confidence;
    confidenceFactors++;
  }

  if (timestampAnalysis) {
    confidence += timestampAnalysis.confidence;
    confidenceFactors++;
  }

  if (keywordMatch && timestampAnalysis) {
    confidence += keywordMatch.confidence * timestampAnalysis.confidence;
    confidenceFactors++;
  }

  const overallConfidence = confidenceFactors > 0
    ? Math.round((confidence / confidenceFactors) * 100) / 100
    : 0;

  let recommendation: EpisodeCheckResult["recommendation"];
  if (overallConfidence >= AUTO_COMPLETE_THRESHOLD) {
    recommendation = "auto_complete";
  } else if (overallConfidence >= MANUAL_REVIEW_THRESHOLD) {
    recommendation = "manual_review";
  } else {
    recommendation = "not_found";
  }

  const summary = buildSummary(
    episode,
    requirement,
    overallConfidence,
    keywordMatch,
    timestampAnalysis,
    recommendation
  );

  return {
    episodeId: episode.id,
    deliverableId: requirement.id,
    overallConfidence,
    keywordMatch,
    timestampAnalysis,
    recommendation,
    summary,
  };
}

function extractAdTimestamp(episode: EpisodeData, requirement: DeliverableRequirement): number | null {
  if (!episode.transcript || !episode.durationSeconds) return null;

  const placement = requirement.requiredPlacement;
  if (!placement || placement === "unknown") return null;

  const duration = episode.durationSeconds;
  switch (placement) {
    case "pre_roll":
      return duration * 0.05;
    case "mid_roll":
      return duration * 0.4;
    case "post_roll":
      return duration * 0.9;
    default:
      return null;
  }
}

function buildSummary(
  episode: EpisodeData,
  requirement: DeliverableRequirement,
  confidence: number,
  keywordMatch: KeywordMatchResult | null,
  timestampAnalysis: TimestampAnalysis | null,
  recommendation: EpisodeCheckResult["recommendation"]
): string {
  const parts: string[] = [];
  parts.push(`Episode "${episode.title}" vs deliverable "${requirement.title}"`);
  parts.push(`Confidence: ${Math.round(confidence * 100)}%`);

  if (keywordMatch) {
    parts.push(`Keywords: ${keywordMatch.matchedKeywords.length}/${keywordMatch.totalKeywords} matched`);
  }
  if (timestampAnalysis) {
    parts.push(`Placement: ${timestampAnalysis.placement.replace("_", "-")}`);
  }

  switch (recommendation) {
    case "auto_complete":
      parts.push("RECOMMENDATION: Auto-complete deliverable");
      break;
    case "manual_review":
      parts.push("RECOMMENDATION: Manual review recommended");
      break;
    case "not_found":
      parts.push("RECOMMENDATION: No matching content found");
      break;
    case "overdue_no_episode":
      parts.push("RECOMMENDATION: Overdue — no episode published");
      break;
  }

  return parts.join("; ");
}

export function batchCheckEpisodes(
  episodeDeliverablePairs: {
    episodes: EpisodeData[];
    requirement: DeliverableRequirement;
  }[]
): EpisodeCheckResult[] {
  return episodeDeliverablePairs.map(({ episodes, requirement }) =>
    checkEpisodeDeliverable(episodes, requirement)
  );
}
