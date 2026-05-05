export interface PodcastClient {
  getEpisodes(): Promise<unknown[]>;
  getEpisode(id: string): Promise<unknown>;
}

export function createBuzzsproutClient(apiKey: string, podcastId: string): PodcastClient {
  const baseUrl = `https://www.buzzsprout.com/api/${podcastId}`;
  return {
    async getEpisodes() {
      const res = await fetch(`${baseUrl}/episodes.json`, {
        headers: { Authorization: `Token token=${apiKey}` },
      });
      return res.json();
    },
    async getEpisode(id: string) {
      const res = await fetch(`${baseUrl}/episodes/${id}.json`, {
        headers: { Authorization: `Token token=${apiKey}` },
      });
      return res.json();
    },
  };
}

export function createTransistorClient(apiKey: string): PodcastClient {
  const baseUrl = "https://api.transistor.fm/v1";
  return {
    async getEpisodes() {
      const res = await fetch(`${baseUrl}/episodes`, {
        headers: { "x-api-key": apiKey },
      });
      const data = await res.json();
      return data.data ?? [];
    },
    async getEpisode(id: string) {
      const res = await fetch(`${baseUrl}/episodes/${id}`, {
        headers: { "x-api-key": apiKey },
      });
      return res.json();
    },
  };
}
