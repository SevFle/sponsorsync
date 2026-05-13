import type {
  PodcastClient,
  PodcastClientConfig,
  PodcastEpisode,
  PodcastShow,
  PodcastPlatform,
  EpisodeSearchParams,
} from "./types";

export class PodcastApiError extends Error {
  constructor(
    public readonly platform: PodcastPlatform,
    public readonly statusCode: number,
    message: string
  ) {
    super(`[${platform}] ${message}`);
    this.name = "PodcastApiError";
  }
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  platform: PodcastPlatform
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    throw new PodcastApiError(
      platform,
      0,
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!response.ok) {
    throw new PodcastApiError(
      platform,
      response.status,
      `API request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

interface BuzzsproutApiEpisode {
  id: number;
  title: string;
  description: string | null;
  summary: string | null;
  audio_url: string | null;
  duration: number | null;
  published_at: string | null;
  status: "published" | "draft";
  season_number: number | null;
  episode_number: number | null;
  transcript_text: string | null;
  show_notes: string | null;
  artwork_url: string | null;
  tags: string[] | null;
}

interface BuzzsproutApiShow {
  id: number;
  title: string;
  description: string | null;
  author: string | null;
  artwork_url: string | null;
  website: string | null;
  feed_url: string | null;
  episode_count: number | null;
}

function mapBuzzsproutEpisode(raw: BuzzsproutApiEpisode): PodcastEpisode {
  return {
    id: String(raw.id),
    platform: "buzzsprout",
    title: raw.title,
    description: raw.description ?? null,
    summary: raw.summary ?? null,
    audioUrl: raw.audio_url ?? null,
    duration: raw.duration ?? null,
    publishedAt: raw.published_at ?? null,
    status: raw.status === "draft" ? "draft" : "published",
    season: raw.season_number ?? null,
    episodeNumber: raw.episode_number ?? null,
    transcript: raw.transcript_text ?? null,
    showNotes: raw.show_notes ?? null,
    artworkUrl: raw.artwork_url ?? null,
    keywords: raw.tags ?? [],
  };
}

export function createBuzzsproutClient(
  config: PodcastClientConfig
): PodcastClient {
  const podcastId = config.podcastId ?? "";
  const baseUrl = `https://www.buzzsprout.com/api/${podcastId}`;
  const headers = { Authorization: `Token token=${config.apiKey}` };

  return {
    async getEpisodes(params?: EpisodeSearchParams): Promise<PodcastEpisode[]> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("per_page", String(params.limit));
      if (params?.page) searchParams.set("page", String(params.page));
      const qs = searchParams.toString();
      const url = `${baseUrl}/episodes.json${qs ? `?${qs}` : ""}`;

      const data = await fetchJson<BuzzsproutApiEpisode[]>(
        url,
        headers,
        "buzzsprout"
      );

      let episodes = Array.isArray(data) ? data.map(mapBuzzsproutEpisode) : [];

      if (params?.query) {
        const q = params.query.toLowerCase();
        episodes = episodes.filter((ep) =>
          ep.title.toLowerCase().includes(q)
        );
      }

      if (params?.status) {
        episodes = episodes.filter((ep) => ep.status === params.status);
      }

      if (params?.after) {
        const afterDate = new Date(params.after);
        episodes = episodes.filter(
          (ep) => ep.publishedAt && new Date(ep.publishedAt) > afterDate
        );
      }

      return episodes;
    },

    async getEpisode(id: string): Promise<PodcastEpisode | null> {
      try {
        const data = await fetchJson<BuzzsproutApiEpisode>(
          `${baseUrl}/episodes/${id}.json`,
          headers,
          "buzzsprout"
        );
        return mapBuzzsproutEpisode(data);
      } catch (error) {
        if (
          error instanceof PodcastApiError &&
          error.statusCode === 404
        ) {
          return null;
        }
        throw error;
      }
    },

    async getShow(): Promise<PodcastShow> {
      const data = await fetchJson<BuzzsproutApiShow>(
        `${baseUrl}.json`,
        headers,
        "buzzsprout"
      );
      return {
        id: String(data.id),
        platform: "buzzsprout",
        title: data.title,
        description: data.description ?? null,
        author: data.author ?? null,
        artworkUrl: data.artwork_url ?? null,
        websiteUrl: data.website ?? null,
        feedUrl: data.feed_url ?? null,
        episodeCount: data.episode_count ?? null,
      };
    },
  };
}

interface TransistorApiEpisode {
  id: string;
  type: string;
  attributes: {
    title: string;
    description: string | null;
    summary: string | null;
    audio_url: string | null;
    duration: number | null;
    published_at: string | null;
    status: "published" | "draft" | "scheduled";
    season: number | null;
    number: number | null;
    transcript_text: string | null;
    show_notes: string | null;
    artwork_url: string | null;
    keywords: string[] | null;
  };
}

interface TransistorApiShow {
  id: string;
  attributes: {
    title: string;
    description: string | null;
    author: string | null;
    artwork_url: string | null;
    website_url: string | null;
    feed_url: string | null;
    episode_count: number | null;
  };
}

interface TransistorEpisodesResponse {
  data: TransistorApiEpisode[];
}

interface TransistorEpisodeResponse {
  data: TransistorApiEpisode;
}

interface TransistorShowResponse {
  data: TransistorApiShow;
}

function mapTransistorEpisode(raw: TransistorApiEpisode): PodcastEpisode {
  const attrs = raw.attributes;
  return {
    id: raw.id,
    platform: "transistor",
    title: attrs.title,
    description: attrs.description ?? null,
    summary: attrs.summary ?? null,
    audioUrl: attrs.audio_url ?? null,
    duration: attrs.duration ?? null,
    publishedAt: attrs.published_at ?? null,
    status: attrs.status ?? "draft",
    season: attrs.season ?? null,
    episodeNumber: attrs.number ?? null,
    transcript: attrs.transcript_text ?? null,
    showNotes: attrs.show_notes ?? null,
    artworkUrl: attrs.artwork_url ?? null,
    keywords: attrs.keywords ?? [],
  };
}

export function createTransistorClient(
  config: PodcastClientConfig
): PodcastClient {
  const baseUrl = "https://api.transistor.fm/v1";
  const headers = { "x-api-key": config.apiKey };

  return {
    async getEpisodes(params?: EpisodeSearchParams): Promise<PodcastEpisode[]> {
      const searchParams = new URLSearchParams();
      if (params?.query) searchParams.set("query", params.query);
      if (params?.status) {
        const statusMap: Record<string, string> = {
          published: "published",
          draft: "draft",
          scheduled: "scheduled",
        };
        searchParams.set(
          "status",
          statusMap[params.status] ?? params.status
        );
      }
      if (params?.limit) searchParams.set("pagination[per]", String(params.limit));
      if (params?.page)
        searchParams.set("pagination[page]", String(params.page));
      if (params?.after) searchParams.set("published_after", params.after);

      const qs = searchParams.toString();
      const url = `${baseUrl}/episodes${qs ? `?${qs}` : ""}`;

      const data = await fetchJson<TransistorEpisodesResponse>(
        url,
        headers,
        "transistor"
      );

      const episodes = Array.isArray(data?.data)
        ? data.data.map(mapTransistorEpisode)
        : [];

      return episodes;
    },

    async getEpisode(id: string): Promise<PodcastEpisode | null> {
      try {
        const data = await fetchJson<TransistorEpisodeResponse>(
          `${baseUrl}/episodes/${id}`,
          headers,
          "transistor"
        );
        return mapTransistorEpisode(data.data);
      } catch (error) {
        if (
          error instanceof PodcastApiError &&
          error.statusCode === 404
        ) {
          return null;
        }
        throw error;
      }
    },

    async getShow(): Promise<PodcastShow> {
      const data = await fetchJson<TransistorShowResponse>(
        `${baseUrl}/show`,
        headers,
        "transistor"
      );
      const attrs = data.data.attributes;
      return {
        id: data.data.id,
        platform: "transistor",
        title: attrs.title,
        description: attrs.description ?? null,
        author: attrs.author ?? null,
        artworkUrl: attrs.artwork_url ?? null,
        websiteUrl: attrs.website_url ?? null,
        feedUrl: attrs.feed_url ?? null,
        episodeCount: attrs.episode_count ?? null,
      };
    },
  };
}

export function createPodcastClient(
  platform: PodcastPlatform,
  config: PodcastClientConfig
): PodcastClient {
  switch (platform) {
    case "buzzsprout":
      return createBuzzsproutClient(config);
    case "transistor":
      return createTransistorClient(config);
  }
}
