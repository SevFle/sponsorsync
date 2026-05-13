export type PodcastPlatform = "buzzsprout" | "transistor";

export interface PodcastEpisode {
  id: string;
  platform: PodcastPlatform;
  title: string;
  description: string | null;
  summary: string | null;
  audioUrl: string | null;
  duration: number | null;
  publishedAt: string | null;
  status: "published" | "draft" | "scheduled";
  season: number | null;
  episodeNumber: number | null;
  transcript: string | null;
  showNotes: string | null;
  artworkUrl: string | null;
  keywords: string[];
}

export interface PodcastShow {
  id: string;
  platform: PodcastPlatform;
  title: string;
  description: string | null;
  author: string | null;
  artworkUrl: string | null;
  websiteUrl: string | null;
  feedUrl: string | null;
  episodeCount: number | null;
}

export interface PodcastClientConfig {
  apiKey: string;
  podcastId?: string;
}

export interface PodcastClient {
  getEpisodes(params?: EpisodeSearchParams): Promise<PodcastEpisode[]>;
  getEpisode(id: string): Promise<PodcastEpisode | null>;
  getShow(): Promise<PodcastShow>;
}

export interface EpisodeSearchParams {
  query?: string;
  status?: "published" | "draft" | "scheduled";
  limit?: number;
  page?: number;
  after?: string;
}

export interface PodcastVerificationData {
  episodeId: string;
  episodeTitle: string;
  episodeUrl: string | null;
  episodePublished: boolean;
  publishedAt: string | null;
  duration: number | null;
  transcript: string | null;
  showNotes: string | null;
  keywords: string[];
  platform: PodcastPlatform;
}

export interface PodcastWebhookEvent {
  platform: PodcastPlatform;
  eventType: "episode.published" | "episode.updated" | "episode.deleted";
  episodeId: string;
  episodeTitle: string;
  timestamp: string;
  raw: Record<string, unknown>;
}

export interface PodcastWebhookPayload {
  platform: PodcastPlatform;
  event: PodcastWebhookEvent;
  verification: PodcastVerificationData | null;
}
