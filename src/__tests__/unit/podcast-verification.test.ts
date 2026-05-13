import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  verifyPodcastDeliverable,
  enrichDeliverableWithContext,
  buildClientFromIntegration,
} from "@/lib/integrations/podcast/verification";
import type { PodcastEpisode } from "@/lib/integrations/podcast/types";

function makeEpisode(overrides: Partial<PodcastEpisode> = {}): PodcastEpisode {
  return {
    id: "ep-1",
    platform: "transistor",
    title: "Sponsored Episode",
    description: "An episode with a sponsor read",
    summary: null,
    audioUrl: "https://audio.example.com/ep1.mp3",
    duration: 1800,
    publishedAt: "2026-01-15T10:00:00Z",
    status: "published",
    season: 1,
    episodeNumber: 5,
    transcript: "This episode is sponsored by Acme Corp",
    showNotes: "Thanks to Acme Corp for sponsoring",
    artworkUrl: "https://art.example.com/ep1.jpg",
    keywords: ["tech", "sponsorship"],
    ...overrides,
  };
}

function mockFetchResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe("verifyPodcastDeliverable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns found result when matching episode exists", async () => {
    const episode = makeEpisode();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({
        data: [
          {
            id: episode.id,
            type: "episode",
            attributes: {
              title: episode.title,
              status: "published",
              audio_url: episode.audioUrl,
              duration: episode.duration,
              published_at: episode.publishedAt,
              transcript_text: episode.transcript,
              show_notes: episode.showNotes,
              keywords: episode.keywords,
            },
          },
        ],
      })
    );

    const result = await verifyPodcastDeliverable({
      platform: "transistor",
      apiKey: "test-key",
      deliverableTitle: "Sponsored Episode",
      sponsorName: "Acme Corp",
    });

    expect(result.found).toBe(true);
    expect(result.episodeId).toBe("ep-1");
    expect(result.verificationData).not.toBeNull();
    expect(result.verificationData!.episodePublished).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("returns not found when no matching episodes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ data: [] })
    );

    const result = await verifyPodcastDeliverable({
      platform: "transistor",
      apiKey: "test-key",
      deliverableTitle: "Nonexistent Episode",
    });

    expect(result.found).toBe(false);
    expect(result.episodeId).toBeNull();
    expect(result.verificationData).toBeNull();
    expect(result.deliverableContext).toBeNull();
    expect(result.evidence).toContain("No matching published episodes found");
  });

  it("returns deliverable context with verification fields", async () => {
    const episode = makeEpisode();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({
        data: [
          {
            id: episode.id,
            type: "episode",
            attributes: {
              title: episode.title,
              status: "published",
              audio_url: episode.audioUrl,
              duration: episode.duration,
              published_at: episode.publishedAt,
              transcript_text: episode.transcript,
              keywords: episode.keywords,
            },
          },
        ],
      })
    );

    const result = await verifyPodcastDeliverable({
      platform: "transistor",
      apiKey: "test-key",
      deliverableTitle: "Sponsored Episode",
    });

    expect(result.found).toBe(true);
    expect(result.deliverableContext).not.toBeNull();
    expect(result.deliverableContext!.verificationData).toBeDefined();
    expect(
      (result.deliverableContext!.verificationData as Record<string, unknown>)!.episodePublished
    ).toBe(true);
  });

  it("searches for episodes published after dueDate minus 30 days", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ data: [] })
    );

    await verifyPodcastDeliverable({
      platform: "transistor",
      apiKey: "test-key",
      deliverableTitle: "Episode",
      dueDate: "2026-03-15T00:00:00Z",
    });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("published_after=");
  });

  it("works with buzzsprout platform", async () => {
    const episode = makeEpisode({ platform: "buzzsprout" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([
        {
          id: 1,
          title: episode.title,
          status: "published",
          audio_url: episode.audioUrl,
          duration: episode.duration,
          published_at: episode.publishedAt,
          tags: episode.keywords,
        },
      ])
    );

    const result = await verifyPodcastDeliverable({
      platform: "buzzsprout",
      apiKey: "bz-key",
      podcastId: "12345",
      deliverableTitle: "Sponsored Episode",
    });

    expect(result.found).toBe(true);
    expect(result.verificationData!.platform).toBe("buzzsprout");
  });
});

describe("enrichDeliverableWithContext", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns verification data when episode found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({
        data: [
          {
            id: "ep-1",
            type: "episode",
            attributes: {
              title: "Ad Read Episode",
              status: "published",
              audio_url: "https://audio.example.com/ep1.mp3",
              duration: 1800,
            },
          },
        ],
      })
    );

    const context = await enrichDeliverableWithContext(
      "transistor",
      "test-key",
      undefined,
      "Ad Read Episode"
    );

    expect(context.verificationData).toBeDefined();
    expect(
      (context.verificationData as Record<string, unknown>)!.episodePublished
    ).toBe(true);
  });

  it("returns null verificationData when no episode found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ data: [] })
    );

    const context = await enrichDeliverableWithContext(
      "transistor",
      "test-key",
      undefined,
      "Missing Episode"
    );

    expect(context.verificationData).toBeNull();
  });
});

describe("buildClientFromIntegration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a client that fetches from the correct platform", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ data: [] })
    );

    const client = buildClientFromIntegration("transistor", "key");
    await client.getEpisodes();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("transistor.fm"),
      expect.anything()
    );
  });

  it("creates a client with podcastId for buzzsprout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse([])
    );

    const client = buildClientFromIntegration("buzzsprout", "key", "99999");
    await client.getEpisodes();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("buzzsprout.com/api/99999"),
      expect.anything()
    );
  });
});
