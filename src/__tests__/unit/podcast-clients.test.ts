import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createBuzzsproutClient,
  createTransistorClient,
  createPodcastClient,
  PodcastApiError,
} from "@/lib/integrations/podcast/clients";
import type { PodcastEpisode } from "@/lib/integrations/podcast/types";

function mockFetchResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe("PodcastApiError", () => {
  it("includes platform and status code in message", () => {
    const error = new PodcastApiError("buzzsprout", 404, "Not found");
    expect(error.name).toBe("PodcastApiError");
    expect(error.message).toBe("[buzzsprout] Not found");
    expect(error.platform).toBe("buzzsprout");
    expect(error.statusCode).toBe(404);
  });
});

describe("createBuzzsproutClient", () => {
  let client: ReturnType<typeof createBuzzsproutClient>;

  beforeEach(() => {
    client = createBuzzsproutClient({ apiKey: "bz-test-key", podcastId: "12345" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with getEpisodes, getEpisode, and getShow", () => {
    expect(client).toHaveProperty("getEpisodes");
    expect(client).toHaveProperty("getEpisode");
    expect(client).toHaveProperty("getShow");
    expect(typeof client.getEpisodes).toBe("function");
    expect(typeof client.getEpisode).toBe("function");
    expect(typeof client.getShow).toBe("function");
  });

  describe("getEpisodes", () => {
    it("fetches episodes with token auth", async () => {
      const mockEpisodes = [
        { id: 1, title: "Episode 1", status: "published", duration: 1800 },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockEpisodes)
      );

      const result = await client.getEpisodes();

      expect(fetch).toHaveBeenCalledWith(
        "https://www.buzzsprout.com/api/12345/episodes.json",
        { headers: { Authorization: "Token token=bz-test-key" } }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "1",
        platform: "buzzsprout",
        title: "Episode 1",
        status: "published",
        duration: 1800,
      });
    });

    it("maps buzzsprout fields to normalized episode format", async () => {
      const mockEpisodes = [
        {
          id: 42,
          title: "Sponsored Episode",
          description: "A great episode",
          summary: "Summary text",
          audio_url: "https://audio.example.com/ep42.mp3",
          duration: 2400,
          published_at: "2026-01-15T10:00:00Z",
          status: "published",
          season_number: 2,
          episode_number: 5,
          transcript_text: "Welcome to the show",
          show_notes: "Show notes here",
          artwork_url: "https://art.example.com/ep42.jpg",
          tags: ["tech", "sponsorship"],
        },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockEpisodes)
      );

      const result = await client.getEpisodes();
      const ep = result[0];

      expect(ep.id).toBe("42");
      expect(ep.platform).toBe("buzzsprout");
      expect(ep.title).toBe("Sponsored Episode");
      expect(ep.description).toBe("A great episode");
      expect(ep.summary).toBe("Summary text");
      expect(ep.audioUrl).toBe("https://audio.example.com/ep42.mp3");
      expect(ep.duration).toBe(2400);
      expect(ep.publishedAt).toBe("2026-01-15T10:00:00Z");
      expect(ep.status).toBe("published");
      expect(ep.season).toBe(2);
      expect(ep.episodeNumber).toBe(5);
      expect(ep.transcript).toBe("Welcome to the show");
      expect(ep.showNotes).toBe("Show notes here");
      expect(ep.artworkUrl).toBe("https://art.example.com/ep42.jpg");
      expect(ep.keywords).toEqual(["tech", "sponsorship"]);
    });

    it("handles null/missing optional fields", async () => {
      const mockEpisodes = [
        { id: 1, title: "Minimal Episode", status: "published" },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockEpisodes)
      );

      const result = await client.getEpisodes();
      const ep = result[0];

      expect(ep.description).toBeNull();
      expect(ep.summary).toBeNull();
      expect(ep.audioUrl).toBeNull();
      expect(ep.duration).toBeNull();
      expect(ep.publishedAt).toBeNull();
      expect(ep.season).toBeNull();
      expect(ep.episodeNumber).toBeNull();
      expect(ep.transcript).toBeNull();
      expect(ep.showNotes).toBeNull();
      expect(ep.artworkUrl).toBeNull();
      expect(ep.keywords).toEqual([]);
    });

    it("filters by query param", async () => {
      const mockEpisodes = [
        { id: 1, title: "Sponsor Read", status: "published" },
        { id: 2, title: "Tech Talk", status: "published" },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockEpisodes)
      );

      const result = await client.getEpisodes({ query: "sponsor" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Sponsor Read");
    });

    it("filters by status param", async () => {
      const mockEpisodes = [
        { id: 1, title: "Published", status: "published" },
        { id: 2, title: "Draft", status: "draft" },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockEpisodes)
      );

      const result = await client.getEpisodes({ status: "draft" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Draft");
    });

    it("filters by after date", async () => {
      const mockEpisodes = [
        { id: 1, title: "Old", status: "published", published_at: "2025-01-01T00:00:00Z" },
        { id: 2, title: "New", status: "published", published_at: "2026-06-01T00:00:00Z" },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockEpisodes)
      );

      const result = await client.getEpisodes({ after: "2026-01-01T00:00:00Z" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("New");
    });

    it("passes limit and page params", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse([])
      );

      await client.getEpisodes({ limit: 10, page: 2 });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=10&page=2"),
        expect.anything()
      );
    });

    it("throws PodcastApiError on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ error: "Unauthorized" }, 401)
      );

      await expect(client.getEpisodes()).rejects.toThrow(PodcastApiError);
      await expect(client.getEpisodes()).rejects.toThrow("[buzzsprout]");
    });

    it("throws PodcastApiError on network failure", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Network timeout")
      );

      await expect(client.getEpisodes()).rejects.toThrow(PodcastApiError);
      await expect(client.getEpisodes()).rejects.toThrow("Network error");
    });
  });

  describe("getEpisode", () => {
    it("fetches single episode by id", async () => {
      const mockEpisode = {
        id: 42,
        title: "Episode 42",
        status: "published",
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockEpisode)
      );

      const result = await client.getEpisode("42");

      expect(fetch).toHaveBeenCalledWith(
        "https://www.buzzsprout.com/api/12345/episodes/42.json",
        { headers: { Authorization: "Token token=bz-test-key" } }
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe("42");
      expect(result!.title).toBe("Episode 42");
    });

    it("returns null for 404", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ error: "Not found" }, 404)
      );

      const result = await client.getEpisode("999");
      expect(result).toBeNull();
    });

    it("rethrows non-404 errors", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ error: "Server error" }, 500)
      );

      await expect(client.getEpisode("42")).rejects.toThrow(PodcastApiError);
    });
  });

  describe("getShow", () => {
    it("fetches show info", async () => {
      const mockShow = {
        id: 12345,
        title: "My Podcast",
        description: "A podcast about stuff",
        author: "John Doe",
        artwork_url: "https://art.example.com/show.jpg",
        website: "https://mypodcast.com",
        feed_url: "https://feeds.buzzsprout.com/12345.rss",
        episode_count: 50,
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(mockShow)
      );

      const result = await client.getShow();

      expect(result).toMatchObject({
        id: "12345",
        platform: "buzzsprout",
        title: "My Podcast",
        description: "A podcast about stuff",
        author: "John Doe",
        artworkUrl: "https://art.example.com/show.jpg",
        websiteUrl: "https://mypodcast.com",
        feedUrl: "https://feeds.buzzsprout.com/12345.rss",
        episodeCount: 50,
      });
    });
  });
});

describe("createTransistorClient", () => {
  let client: ReturnType<typeof createTransistorClient>;

  beforeEach(() => {
    client = createTransistorClient({ apiKey: "tr-test-key" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with getEpisodes, getEpisode, and getShow", () => {
    expect(client).toHaveProperty("getEpisodes");
    expect(client).toHaveProperty("getEpisode");
    expect(client).toHaveProperty("getShow");
  });

  describe("getEpisodes", () => {
    it("fetches from Transistor episodes endpoint with x-api-key header", async () => {
      const mockEpisodes = [
        {
          id: "ep-1",
          type: "episode",
          attributes: {
            title: "Ep 1",
            status: "published",
          },
        },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ data: mockEpisodes })
      );

      const result = await client.getEpisodes();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.transistor.fm/v1/episodes",
        { headers: { "x-api-key": "tr-test-key" } }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "ep-1",
        platform: "transistor",
        title: "Ep 1",
        status: "published",
      });
    });

    it("maps transistor JSON:API attributes to normalized format", async () => {
      const mockEpisodes = [
        {
          id: "ep-42",
          type: "episode",
          attributes: {
            title: "Sponsored Show",
            description: "A sponsored episode",
            summary: "Summary",
            audio_url: "https://media.transistor.fm/ep42.mp3",
            duration: 3600,
            published_at: "2026-03-10T12:00:00Z",
            status: "published",
            season: 1,
            number: 10,
            transcript_text: "Full transcript here",
            show_notes: "Detailed show notes",
            artwork_url: "https://art.transistor.fm/ep42.jpg",
            keywords: ["podcast", "sponsor"],
          },
        },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ data: mockEpisodes })
      );

      const result = await client.getEpisodes();
      const ep = result[0];

      expect(ep).toMatchObject({
        id: "ep-42",
        platform: "transistor",
        title: "Sponsored Show",
        description: "A sponsored episode",
        summary: "Summary",
        audioUrl: "https://media.transistor.fm/ep42.mp3",
        duration: 3600,
        publishedAt: "2026-03-10T12:00:00Z",
        status: "published",
        season: 1,
        episodeNumber: 10,
        transcript: "Full transcript here",
        showNotes: "Detailed show notes",
        artworkUrl: "https://art.transistor.fm/ep42.jpg",
        keywords: ["podcast", "sponsor"],
      });
    });

    it("returns empty array when response has no data key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({})
      );

      const result = await client.getEpisodes();
      expect(result).toEqual([]);
    });

    it("passes query, status, limit, page, and after params", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ data: [] })
      );

      await client.getEpisodes({
        query: "test",
        status: "published",
        limit: 5,
        page: 3,
        after: "2026-01-01T00:00:00Z",
      });

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("query=test");
      expect(calledUrl).toContain("status=published");
      expect(calledUrl).toContain("pagination%5Bper%5D=5");
      expect(calledUrl).toContain("pagination%5Bpage%5D=3");
      expect(calledUrl).toContain("published_after=2026-01-01T00%3A00%3A00Z");
    });

    it("throws PodcastApiError on network failure", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Connection refused")
      );

      await expect(client.getEpisodes()).rejects.toThrow(PodcastApiError);
      await expect(client.getEpisodes()).rejects.toThrow("[transistor]");
    });
  });

  describe("getEpisode", () => {
    it("fetches single episode by id", async () => {
      const mockEpisode = {
        id: "ep-99",
        type: "episode",
        attributes: {
          title: "Ep 99",
          status: "published",
        },
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ data: mockEpisode })
      );

      const result = await client.getEpisode("ep-99");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.transistor.fm/v1/episodes/ep-99",
        { headers: { "x-api-key": "tr-test-key" } }
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe("ep-99");
    });

    it("returns null for 404", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ error: "Not found" }, 404)
      );

      const result = await client.getEpisode("missing");
      expect(result).toBeNull();
    });
  });

  describe("getShow", () => {
    it("fetches show info", async () => {
      const mockShow = {
        id: "show-1",
        attributes: {
          title: "My Transistor Show",
          description: "Show description",
          author: "Jane Doe",
          artwork_url: "https://art.example.com/show.jpg",
          website_url: "https://show.example.com",
          feed_url: "https://feeds.transistor.fm/show",
          episode_count: 100,
        },
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ data: mockShow })
      );

      const result = await client.getShow();

      expect(result).toMatchObject({
        id: "show-1",
        platform: "transistor",
        title: "My Transistor Show",
        description: "Show description",
        author: "Jane Doe",
        feedUrl: "https://feeds.transistor.fm/show",
        episodeCount: 100,
      });
    });
  });
});

describe("createPodcastClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates buzzsprout client for buzzsprout platform", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([])
    );
    const client = createPodcastClient("buzzsprout", {
      apiKey: "key",
      podcastId: "123",
    });
    await client.getEpisodes();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("buzzsprout.com"),
      expect.anything()
    );
  });

  it("creates transistor client for transistor platform", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ data: [] })
    );
    const client = createPodcastClient("transistor", { apiKey: "key" });
    await client.getEpisodes();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("transistor.fm"),
      expect.anything()
    );
  });
});
