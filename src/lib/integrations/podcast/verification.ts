import type { PodcastClient, PodcastPlatform, PodcastVerificationData } from "./types";
import { createPodcastClient } from "./clients";
import {
  episodeToVerificationData,
  findMatchingEpisodes,
  extractVerificationFields,
  type DeliverableMatchCriteria,
} from "./mapper";
import type { VerificationContext } from "@/lib/deliverables/types";

export interface VerificationRequest {
  platform: PodcastPlatform;
  apiKey: string;
  podcastId?: string;
  deliverableTitle: string;
  sponsorName?: string;
  dueDate?: string;
  keywords?: string[];
}

export interface VerificationResult {
  found: boolean;
  episodeId: string | null;
  verificationData: PodcastVerificationData | null;
  deliverableContext: Partial<VerificationContext> | null;
  confidence: number;
  evidence: string[];
}

export async function verifyPodcastDeliverable(
  request: VerificationRequest
): Promise<VerificationResult> {
  const client = createPodcastClient(request.platform, {
    apiKey: request.apiKey,
    podcastId: request.podcastId,
  });

  const publishedAfter = request.dueDate
    ? new Date(
        new Date(request.dueDate).getTime() - 30 * 24 * 60 * 60 * 1000
      ).toISOString()
    : undefined;

  const episodes = await client.getEpisodes({
    query: request.deliverableTitle,
    status: "published",
    limit: 20,
    after: publishedAfter,
  });

  const matchCriteria: DeliverableMatchCriteria = {
    episodeTitle: request.deliverableTitle,
    sponsorName: request.sponsorName,
    publishedAfter,
    keywords: request.keywords,
  };

  const matches = findMatchingEpisodes(episodes, matchCriteria);

  if (matches.length === 0) {
    return {
      found: false,
      episodeId: null,
      verificationData: null,
      deliverableContext: null,
      confidence: 0,
      evidence: ["No matching published episodes found"],
    };
  }

  const bestMatch = matches[0];
  const verificationData = episodeToVerificationData(bestMatch);
  const verificationFields = extractVerificationFields(verificationData);

  return {
    found: true,
    episodeId: bestMatch.id,
    verificationData,
    deliverableContext: {
      verificationData: verificationFields,
    },
    confidence: bestMatch.matchConfidence,
    evidence: bestMatch.matchEvidence,
  };
}

export async function enrichDeliverableWithContext(
  platform: PodcastPlatform,
  apiKey: string,
  podcastId: string | undefined,
  deliverableTitle: string,
  sponsorName?: string,
  dueDate?: string,
  keywords?: string[]
): Promise<Partial<VerificationContext>> {
  const result = await verifyPodcastDeliverable({
    platform,
    apiKey,
    podcastId,
    deliverableTitle,
    sponsorName,
    dueDate,
    keywords,
  });

  if (!result.found || !result.deliverableContext) {
    return { verificationData: null };
  }

  return result.deliverableContext;
}

export function buildClientFromIntegration(
  platform: PodcastPlatform,
  apiKey: string,
  podcastId?: string
): PodcastClient {
  return createPodcastClient(platform, { apiKey, podcastId });
}
