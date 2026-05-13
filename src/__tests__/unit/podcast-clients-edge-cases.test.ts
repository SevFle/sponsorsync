import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createBuzzsproutClient,
  createTransistorClient,
  createPodcastClient,
  PodcastApiError,
} from "@/lib/integrations/podcast/clients";

function mockFetchResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe("Buzzsprout edge cases", () => {
  let client: ReturnType<typeof createBuzzsproutClient>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses empty string in baseUrl path when podcastId is undefined", async () => {
    client = createBuzzsproutClient({ apiKey: "test-key" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([])
    );

    await client.getEpisodes();

    expect(fetch).toHaveBeenCalledWith(
      "https://www.buzzsprout.com/api//episodes.json",
      expect.anything()
    );
  });

  it("returns empty array when API returns a plain object instead of array", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({})
    );

    const result = await client.getEpisodes();
    expect(result).toEqual([]);
  });

  it("returns empty array when API returns null", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(null)
    );

    const result = await client.getEpisodes();
    expect(result).toEqual([]);
  });

  it("maps status 'draft' to 'draft'", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([{ id: 1, title: "Draft", status: "draft" }])
    );

    const result = await client.getEpisodes();
    expect(result[0].status).toBe("draft");
  });

  it("maps unknown status values like 'scheduled' to 'published'", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([
        { id: 1, title: "Scheduled", status: "scheduled" as string },
      ])
    );

    const result = await client.getEpisodes();
    expect(result[0].status).toBe("published");
  });

  it("applies query, status, and after filters together", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    const mockEpisodes = [
      { id: 1, title: "Tech Talk", status: "published", published_at: "2025-06-01T00:00:00Z" },
      { id: 2, title: "Tech Deep Dive", status: "draft", published_at: "2026-06-01T00:00:00Z" },
      { id: 3, title: "Tech Future", status: "published", published_at: "2026-06-01T00:00:00Z" },
      { id: 4, title: "Health Tips", status: "published", published_at: "2026-06-01T00:00:00Z" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(mockEpisodes)
    );

    const result = await client.getEpisodes({
      query: "tech",
      status: "published",
      after: "2026-01-01T00:00:00Z",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
    expect(result[0].title).toBe("Tech Future");
  });

  it("getEpisode rethrows non-PodcastApiError errors", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    } as Response);

    await expect(client.getEpisode("42")).rejects.toThrow(SyntaxError);
  });

  it("getShow maps all null optional fields to null", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({
        id: 999,
        title: "Minimal Show",
        description: null,
        author: null,
        artwork_url: null,
        website: null,
        feed_url: null,
        episode_count: null,
      })
    );

    const result = await client.getShow();

    expect(result).toMatchObject({
      id: "999",
      platform: "buzzsprout",
      title: "Minimal Show",
      description: null,
      author: null,
      artworkUrl: null,
      websiteUrl: null,
      feedUrl: null,
      episodeCount: null,
    });
  });

  it("filters out episodes with null published_at when after filter is applied", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([
        { id: 1, title: "No Date", status: "published", published_at: null },
        { id: 2, title: "Has Date", status: "published", published_at: "2026-06-01T00:00:00Z" },
      ])
    );

    const result = await client.getEpisodes({ after: "2026-01-01T00:00:00Z" });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Has Date");
  });

  it("getEpisodes returns empty array from API empty array", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([])
    );

    const result = await client.getEpisodes();
    expect(result).toEqual([]);
  });

  it("wraps non-Error network failure in PodcastApiError with 'Unknown error'", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue("connection reset");

    await expect(client.getEpisodes()).rejects.toThrow(PodcastApiError);
    try {
      await client.getEpisodes();
    } catch (error) {
      expect(error).toBeInstanceOf(PodcastApiError);
      expect((error as PodcastApiError).message).toContain("Unknown error");
    }
  });

  it("wraps numeric rejection in PodcastApiError with 'Unknown error'", async () => {
    client = createBuzzsproutClient({ apiKey: "key", podcastId: "123" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(42);

    try {
      await client.getEpisodes();
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PodcastApiError);
      expect((error as PodcastApiError).message).toContain("Unknown error");
    }
  });
});

describe("Transistor edge cases", () => {
  let client: ReturnType<typeof createTransistorClient>;

  beforeEach(() => {
    client = createTransistorClient({ apiKey: "tr-key" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws PodcastApiError with transistor platform on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ error: "Unauthorized" }, 401)
    );

    try {
      await client.getEpisodes();
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PodcastApiError);
      expect((error as PodcastApiError).platform).toBe("transistor");
      expect((error as PodcastApiError).statusCode).toBe(401);
    }
  });

  it("getEpisode maps null optional attributes fields to null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({
        data: {
          id: "ep-min",
          type: "episode",
          attributes: {
            title: "Minimal Episode",
            description: null,
            summary: null,
            audio_url: null,
            duration: null,
            published_at: null,
            status: "draft",
            season: null,
            number: null,
            transcript_text: null,
            show_notes: null,
            artwork_url: null,
            keywords: null,
          },
        },
      })
    );

    const result = await client.getEpisode("ep-min");

    expect(result).toMatchObject({
      id: "ep-min",
      platform: "transistor",
      title: "Minimal Episode",
      description: null,
      summary: null,
      audioUrl: null,
      duration: null,
      publishedAt: null,
      status: "draft",
      season: null,
      episodeNumber: null,
      transcript: null,
      showNotes: null,
      artworkUrl: null,
      keywords: [],
    });
  });

  it("getShow maps all null optional attributes to null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({
        data: {
          id: "show-min",
          attributes: {
            title: "Minimal Transistor Show",
            description: null,
            author: null,
            artwork_url: null,
            website_url: null,
            feed_url: null,
            episode_count: null,
          },
        },
      })
    );

    const result = await client.getShow();

    expect(result).toMatchObject({
      id: "show-min",
      platform: "transistor",
      title: "Minimal Transistor Show",
      description: null,
      author: null,
      artworkUrl: null,
      websiteUrl: null,
      feedUrl: null,
      episodeCount: null,
    });
  });

  it("getEpisode rethrows 500 errors as PodcastApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ error: "Internal Server Error" }, 500)
    );

    await expect(client.getEpisode("ep-1")).rejects.toThrow(PodcastApiError);
    try {
      await client.getEpisode("ep-1");
    } catch (error) {
      expect(error).toBeInstanceOf(PodcastApiError);
      expect((error as PodcastApiError).statusCode).toBe(500);
    }
  });

  it("wraps non-Error network failure in PodcastApiError with 'Unknown error'", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue("timeout");

    try {
      await client.getEpisodes();
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PodcastApiError);
      expect((error as PodcastApiError).platform).toBe("transistor");
      expect((error as PodcastApiError).message).toContain("Unknown error");
    }
  });
});

describe("createPodcastClient exhaustive platform coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a working buzzsprout client for 'buzzsprout' platform with all methods", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([])
    );

    const client = createPodcastClient("buzzsprout", {
      apiKey: "key",
      podcastId: "99",
    });

    expect(typeof client.getEpisodes).toBe("function");
    expect(typeof client.getEpisode).toBe("function");
    expect(typeof client.getShow).toBe("function");

    await client.getEpisodes();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("buzzsprout.com"),
      expect.anything()
    );
  });

  it("returns a working transistor client for 'transistor' platform with all methods", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ data: [] })
    );

    const client = createPodcastClient("transistor", { apiKey: "key" });

    expect(typeof client.getEpisodes).toBe("function");
    expect(typeof client.getEpisode).toBe("function");
    expect(typeof client.getShow).toBe("function");

    await client.getEpisodes();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("transistor.fm"),
      expect.anything()
    );
  });
});
