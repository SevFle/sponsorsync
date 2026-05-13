import { describe, it, expect } from "vitest";
import type { PodcastEpisode, PodcastPlatform } from "@/lib/integrations/podcast/types";
import {
  episodeToVerificationData,
  matchEpisodeToDeliverable,
  findMatchingEpisodes,
  extractVerificationFields,
  parsePlatformFromIntegration,
} from "@/lib/integrations/podcast/mapper";

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

describe("episodeToVerificationData", () => {
  it("maps episode fields to verification data", () => {
    const episode = makeEpisode();
    const data = episodeToVerificationData(episode);

    expect(data).toEqual({
      episodeId: "ep-1",
      episodeTitle: "Sponsored Episode",
      episodeUrl: "https://audio.example.com/ep1.mp3",
      episodePublished: true,
      publishedAt: "2026-01-15T10:00:00Z",
      duration: 1800,
      transcript: "This episode is sponsored by Acme Corp",
      showNotes: "Thanks to Acme Corp for sponsoring",
      keywords: ["tech", "sponsorship"],
      platform: "transistor",
    });
  });

  it("sets episodePublished to false for draft episodes", () => {
    const episode = makeEpisode({ status: "draft" });
    const data = episodeToVerificationData(episode);
    expect(data.episodePublished).toBe(false);
  });

  it("handles null optional fields", () => {
    const episode = makeEpisode({
      audioUrl: null,
      duration: null,
      transcript: null,
      showNotes: null,
      publishedAt: null,
      keywords: [],
    });
    const data = episodeToVerificationData(episode);

    expect(data.episodeUrl).toBeNull();
    expect(data.duration).toBeNull();
    expect(data.transcript).toBeNull();
    expect(data.showNotes).toBeNull();
    expect(data.publishedAt).toBeNull();
    expect(data.keywords).toEqual([]);
  });
});

describe("matchEpisodeToDeliverable", () => {
  it("matches by exact title", () => {
    const episode = makeEpisode({ title: "Sponsored Episode" });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
    });

    expect(result.matched).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.evidence).toContain("Episode title matches exactly");
  });

  it("matches by partial title", () => {
    const episode = makeEpisode({ title: "Episode 5 - Sponsored Read" });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Read",
    });

    expect(result.matched).toBe(true);
    expect(result.evidence).toContain("Episode title partially matches");
  });

  it("does not match when titles are unrelated", () => {
    const episode = makeEpisode({ title: "Tech News Roundup" });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Cooking Tips",
    });

    expect(result.matched).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("matches sponsor name in episode content", () => {
    const episode = makeEpisode({
      title: "Weekly Update",
      description: "Thanks to our sponsor Acme Corp",
      transcript: null,
      showNotes: null,
    });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Weekly Update",
      sponsorName: "Acme Corp",
    });

    expect(result.matched).toBe(true);
    expect(result.evidence).toContain(
      'Sponsor "Acme Corp" found in episode content'
    );
  });

  it("does not match when sponsor is missing from content", () => {
    const episode = makeEpisode({
      title: "Sponsored Episode",
      description: "Just a regular episode",
      transcript: null,
      showNotes: null,
    });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      sponsorName: "Missing Corp",
    });

    expect(result.confidence).toBeLessThan(1);
  });

  it("matches sponsor in transcript", () => {
    const episode = makeEpisode({
      title: "Sponsored Episode",
      description: null,
      transcript: "This episode is sponsored by Acme Corp",
      showNotes: null,
    });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      sponsorName: "Acme Corp",
    });

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(1);
  });

  it("matches by publishedAfter date", () => {
    const episode = makeEpisode({
      publishedAt: "2026-03-15T10:00:00Z",
    });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      publishedAfter: "2026-01-01T00:00:00Z",
    });

    expect(result.evidence).toContain("Episode published after 2026-01-01T00:00:00Z");
  });

  it("does not match when episode is before publishedAfter", () => {
    const episode = makeEpisode({
      publishedAt: "2025-06-01T00:00:00Z",
    });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      publishedAfter: "2026-01-01T00:00:00Z",
    });

    expect(result.evidence).not.toContain(
      expect.stringContaining("Episode published after")
    );
  });

  it("matches by publishedBefore date", () => {
    const episode = makeEpisode({
      publishedAt: "2026-01-15T10:00:00Z",
    });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      publishedBefore: "2026-06-01T00:00:00Z",
    });

    expect(result.evidence).toContain("Episode published before 2026-06-01T00:00:00Z");
  });

  it("matches by keywords", () => {
    const episode = makeEpisode({ keywords: ["tech", "sponsorship", "ad"] });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      keywords: ["tech", "ad"],
    });

    expect(result.matched).toBe(true);
    expect(result.evidence).toContain("Matched keywords: tech, ad");
  });

  it("case-insensitive keyword matching", () => {
    const episode = makeEpisode({ keywords: ["Tech", "Sponsorship"] });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      keywords: ["tech"],
    });

    expect(result.evidence).toContain("Matched keywords: tech");
  });
});

describe("findMatchingEpisodes", () => {
  it("returns matching episodes sorted by confidence", () => {
    const episodes = [
      makeEpisode({ id: "ep-1", title: "Sponsored Episode - Bonus" }),
      makeEpisode({ id: "ep-2", title: "Sponsored Episode" }),
      makeEpisode({ id: "ep-3", title: "Unrelated" }),
    ];

    const results = findMatchingEpisodes(episodes, {
      episodeTitle: "Sponsored Episode",
    });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("ep-2");
    expect(results[0].matchConfidence).toBeGreaterThanOrEqual(results[1].matchConfidence);
  });

  it("filters out low-confidence matches", () => {
    const episodes = [
      makeEpisode({ id: "ep-1", title: "Completely Different Title" }),
    ];

    const results = findMatchingEpisodes(episodes, {
      episodeTitle: "Sponsored Episode",
    });

    expect(results).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    const results = findMatchingEpisodes([], {
      episodeTitle: "Sponsored Episode",
    });
    expect(results).toEqual([]);
  });

  it("includes matchConfidence and matchEvidence on results", () => {
    const episodes = [
      makeEpisode({ id: "ep-1", title: "Sponsored Episode" }),
    ];

    const results = findMatchingEpisodes(episodes, {
      episodeTitle: "Sponsored Episode",
    });

    expect(results[0]).toHaveProperty("matchConfidence");
    expect(results[0]).toHaveProperty("matchEvidence");
    expect(results[0].matchEvidence.length).toBeGreaterThan(0);
  });
});

describe("extractVerificationFields", () => {
  it("converts verification data to flat record for deliverable context", () => {
    const verificationData = {
      episodeId: "ep-1",
      episodeTitle: "Test Episode",
      episodeUrl: "https://audio.example.com/ep1.mp3",
      episodePublished: true,
      publishedAt: "2026-01-15T10:00:00Z",
      duration: 1800,
      transcript: "Transcript text",
      showNotes: "Show notes",
      keywords: ["tech"],
      platform: "transistor" as PodcastPlatform,
    };

    const result = extractVerificationFields(verificationData);

    expect(result).toEqual({
      episodeUrl: "https://audio.example.com/ep1.mp3",
      episodePublished: true,
      publishedAt: "2026-01-15T10:00:00Z",
      adDurationSeconds: 1800,
      transcript: "Transcript text",
      showNotes: "Show notes",
      platform: "transistor",
      sourceEpisodeId: "ep-1",
    });
  });
});

describe("parsePlatformFromIntegration", () => {
  it("returns buzzsprout for buzzsprout", () => {
    expect(parsePlatformFromIntegration("buzzsprout")).toBe("buzzsprout");
  });

  it("returns transistor for transistor", () => {
    expect(parsePlatformFromIntegration("transistor")).toBe("transistor");
  });

  it("returns null for unknown platforms", () => {
    expect(parsePlatformFromIntegration("anchor")).toBeNull();
    expect(parsePlatformFromIntegration("spotify")).toBeNull();
    expect(parsePlatformFromIntegration("")).toBeNull();
  });
});
