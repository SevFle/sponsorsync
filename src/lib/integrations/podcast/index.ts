export type {
  PodcastPlatform,
  PodcastEpisode,
  PodcastShow,
  PodcastClient,
  PodcastClientConfig,
  EpisodeSearchParams,
  PodcastVerificationData,
  PodcastWebhookEvent,
  PodcastWebhookPayload,
} from "./types";

export {
  createBuzzsproutClient,
  createTransistorClient,
  createPodcastClient,
  PodcastApiError,
} from "./clients";

export {
  episodeToVerificationData,
  matchEpisodeToDeliverable,
  findMatchingEpisodes,
  extractVerificationFields,
  parsePlatformFromIntegration,
  type DeliverableMatchCriteria,
} from "./mapper";

export {
  verifyPodcastDeliverable,
  enrichDeliverableWithContext,
  buildClientFromIntegration,
  type VerificationRequest,
  type VerificationResult,
} from "./verification";
