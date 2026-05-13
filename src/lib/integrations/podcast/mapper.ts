import type { PodcastEpisode, PodcastVerificationData, PodcastPlatform } from "./types";

export interface DeliverableMatchCriteria {
  episodeTitle: string;
  sponsorName?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  keywords?: string[];
}

export function episodeToVerificationData(
  episode: PodcastEpisode
): PodcastVerificationData {
  return {
    episodeId: episode.id,
    episodeTitle: episode.title,
    episodeUrl: episode.audioUrl,
    episodePublished: episode.status === "published",
    publishedAt: episode.publishedAt,
    duration: episode.duration,
    transcript: episode.transcript,
    showNotes: episode.showNotes,
    keywords: episode.keywords,
    platform: episode.platform,
  };
}

export function matchEpisodeToDeliverable(
  episode: PodcastEpisode,
  criteria: DeliverableMatchCriteria
): { matched: boolean; confidence: number; evidence: string[] } {
  const evidence: string[] = [];
  let score = 0;
  let maxScore = 0;

  const epTitleLower = episode.title.toLowerCase();
  const criteriaTitleLower = criteria.episodeTitle.toLowerCase();

  maxScore += 1;
  if (epTitleLower === criteriaTitleLower) {
    score += 1;
    evidence.push("Episode title matches exactly");
  } else if (epTitleLower.includes(criteriaTitleLower)) {
    score += 0.8;
    evidence.push("Episode title partially matches");
  }

  if (criteria.sponsorName) {
    maxScore += 1;
    const sponsorLower = criteria.sponsorName.toLowerCase();
    const contentToSearch = [
      episode.title,
      episode.description,
      episode.showNotes,
      episode.transcript,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (contentToSearch.includes(sponsorLower)) {
      score += 1;
      evidence.push(`Sponsor "${criteria.sponsorName}" found in episode content`);
    }
  }

  if (criteria.publishedAfter) {
    maxScore += 0.5;
    if (episode.publishedAt) {
      const pubDate = new Date(episode.publishedAt);
      const afterDate = new Date(criteria.publishedAfter);
      if (pubDate >= afterDate) {
        score += 0.5;
        evidence.push(`Episode published after ${criteria.publishedAfter}`);
      }
    }
  }

  if (criteria.publishedBefore) {
    maxScore += 0.5;
    if (episode.publishedAt) {
      const pubDate = new Date(episode.publishedAt);
      const beforeDate = new Date(criteria.publishedBefore);
      if (pubDate <= beforeDate) {
        score += 0.5;
        evidence.push(`Episode published before ${criteria.publishedBefore}`);
      }
    }
  }

  if (criteria.keywords && criteria.keywords.length > 0) {
    maxScore += 0.5;
    const episodeKeywords = episode.keywords.map((k) => k.toLowerCase());
    const matchedKeywords = criteria.keywords.filter((k) =>
      episodeKeywords.includes(k.toLowerCase())
    );
    if (matchedKeywords.length > 0) {
      const keywordScore = matchedKeywords.length / criteria.keywords.length;
      score += keywordScore * 0.5;
      evidence.push(`Matched keywords: ${matchedKeywords.join(", ")}`);
    }
  }

  const confidence = maxScore > 0 ? score / maxScore : 0;

  return {
    matched: confidence >= 0.5,
    confidence,
    evidence,
  };
}

export function findMatchingEpisodes(
  episodes: PodcastEpisode[],
  criteria: DeliverableMatchCriteria
): Array<PodcastEpisode & { matchConfidence: number; matchEvidence: string[] }> {
  return episodes
    .map((episode) => {
      const result = matchEpisodeToDeliverable(episode, criteria);
      return {
        ...episode,
        matchConfidence: result.confidence,
        matchEvidence: result.evidence,
      };
    })
    .filter((ep) => ep.matchConfidence >= 0.5)
    .sort((a, b) => b.matchConfidence - a.matchConfidence);
}

export function extractVerificationFields(
  verificationData: PodcastVerificationData
): Record<string, unknown> {
  return {
    episodeUrl: verificationData.episodeUrl,
    episodePublished: verificationData.episodePublished,
    publishedAt: verificationData.publishedAt,
    adDurationSeconds: verificationData.duration,
    transcript: verificationData.transcript,
    showNotes: verificationData.showNotes,
    platform: verificationData.platform,
    sourceEpisodeId: verificationData.episodeId,
  };
}

export function parsePlatformFromIntegration(
  platform: string
): PodcastPlatform | null {
  if (platform === "buzzsprout" || platform === "transistor") return platform;
  return null;
}
