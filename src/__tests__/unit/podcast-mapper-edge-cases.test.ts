import { describe, it, expect } from "vitest";
import type { PodcastEpisode } from "@/lib/integrations/podcast/types";
import {
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

describe("matchEpisodeToDeliverable edge cases", () => {
  it("does not add publishedAfter evidence when episode publishedAt is null", () => {
    const episode = makeEpisode({ publishedAt: null });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      publishedAfter: "2026-01-01T00:00:00Z",
    });

    expect(result.evidence).not.toContainEqual(
      expect.stringContaining("Episode published after")
    );
    expect(result.confidence).toBeLessThan(1);
  });

  it("does not add publishedBefore evidence when episode publishedAt is null", () => {
    const episode = makeEpisode({ publishedAt: null });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      publishedBefore: "2026-12-31T23:59:59Z",
    });

    expect(result.evidence).not.toContainEqual(
      expect.stringContaining("Episode published before")
    );
    expect(result.confidence).toBeLessThan(1);
  });

  it("matches with only episodeTitle provided and no other criteria", () => {
    const episode = makeEpisode();
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
    });

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual(["Episode title matches exactly"]);
  });

  it("returns confidence 1.0 when all criteria match exactly", () => {
    const episode = makeEpisode({
      title: "Tech Talk Episode 5",
      description: null,
      transcript: "Brought to you by MegaCorp",
      showNotes: null,
      publishedAt: "2026-03-15T12:00:00Z",
      keywords: ["technology", "ai", "startup", "innovation"],
    });

    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Tech Talk Episode 5",
      sponsorName: "MegaCorp",
      publishedAfter: "2026-01-01T00:00:00Z",
      publishedBefore: "2026-12-31T23:59:59Z",
      keywords: ["technology", "ai", "startup", "innovation"],
    });

    expect(result.confidence).toBe(1);
    expect(result.matched).toBe(true);
    expect(result.evidence).toHaveLength(5);
  });

  it("matches when confidence is exactly 0.5 at the boundary", () => {
    const episode = makeEpisode({
      title: "Sponsored Episode",
      description: "No sponsor mention here",
      transcript: null,
      showNotes: null,
    });

    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      sponsorName: "Ghost Sponsor",
    });

    expect(result.confidence).toBe(0.5);
    expect(result.matched).toBe(true);
  });

  it("returns confidence 0 when no criteria match at all", () => {
    const episode = makeEpisode({ title: "Completely Unrelated Title" });
    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Something Else Entirely",
    });

    expect(result.confidence).toBe(0);
    expect(result.matched).toBe(false);
    expect(result.evidence).toEqual([]);
  });

  it("scores partial keyword match proportionally", () => {
    const episode = makeEpisode({
      title: "Sponsored Episode",
      keywords: ["tech", "sponsorship"],
    });

    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      keywords: ["tech", "sponsorship", "ai", "blockchain"],
    });

    expect(result.evidence).toContain("Matched keywords: tech, sponsorship");
    expect(result.confidence).toBeLessThan(1);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("finds sponsor name in showNotes when not in title or description", () => {
    const episode = makeEpisode({
      title: "Regular Episode",
      description: "A discussion about weather patterns",
      transcript: null,
      showNotes: "Special thanks to Zenith Labs for making this possible",
    });

    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Regular Episode",
      sponsorName: "Zenith Labs",
    });

    expect(result.evidence).toContain(
      'Sponsor "Zenith Labs" found in episode content'
    );
    expect(result.matched).toBe(true);
  });

  it("matches sponsor name case-insensitively", () => {
    const episode = makeEpisode({
      title: "Weekly Show",
      description: "Sponsored by ACME CORP this week",
      transcript: null,
      showNotes: null,
    });

    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Weekly Show",
      sponsorName: "acme corp",
    });

    expect(result.evidence).toContain(
      'Sponsor "acme corp" found in episode content'
    );
    expect(result.matched).toBe(true);
  });

  it("includes publishedAfter evidence when episode date equals after date", () => {
    const episode = makeEpisode({
      publishedAt: "2026-03-15T10:00:00Z",
    });

    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      publishedAfter: "2026-03-15T10:00:00Z",
    });

    expect(result.evidence).toContain(
      "Episode published after 2026-03-15T10:00:00Z"
    );
  });

  it("includes publishedBefore evidence when episode date equals before date", () => {
    const episode = makeEpisode({
      publishedAt: "2026-03-15T10:00:00Z",
    });

    const result = matchEpisodeToDeliverable(episode, {
      episodeTitle: "Sponsored Episode",
      publishedBefore: "2026-03-15T10:00:00Z",
    });

    expect(result.evidence).toContain(
      "Episode published before 2026-03-15T10:00:00Z"
    );
  });
});

describe("findMatchingEpisodes edge cases", () => {
  it("preserves stable order when multiple episodes have the same confidence", () => {
    const episodes = [
      makeEpisode({ id: "ep-a", title: "Sponsored Episode" }),
      makeEpisode({ id: "ep-b", title: "Sponsored Episode" }),
      makeEpisode({ id: "ep-c", title: "Sponsored Episode" }),
    ];

    const results = findMatchingEpisodes(episodes, {
      episodeTitle: "Sponsored Episode",
    });

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(["ep-a", "ep-b", "ep-c"]);
    expect(results[0].matchConfidence).toBe(results[1].matchConfidence);
    expect(results[1].matchConfidence).toBe(results[2].matchConfidence);
  });

  it("returns empty when all episodes are below threshold", () => {
    const episodes = [
      makeEpisode({ id: "ep-1", title: "Cooking with Fire" }),
      makeEpisode({ id: "ep-2", title: "Gardening Tips Daily" }),
      makeEpisode({ id: "ep-3", title: "Travel Adventures" }),
    ];

    const results = findMatchingEpisodes(episodes, {
      episodeTitle: "Sponsored Episode",
    });

    expect(results).toEqual([]);
  });

  it("returns single episode when only one is above threshold", () => {
    const episodes = [
      makeEpisode({ id: "ep-1", title: "Sponsored Episode" }),
      makeEpisode({ id: "ep-2", title: "Gardening Tips Daily" }),
      makeEpisode({ id: "ep-3", title: "Travel Adventures" }),
    ];

    const results = findMatchingEpisodes(episodes, {
      episodeTitle: "Sponsored Episode",
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("ep-1");
    expect(results[0].matchConfidence).toBeGreaterThanOrEqual(0.5);
  });
});

describe("extractVerificationFields edge cases", () => {
  it("handles all nullable fields set to null", () => {
    const verificationData = {
      episodeId: "ep-1",
      episodeTitle: "Test Episode",
      episodeUrl: null,
      episodePublished: false,
      publishedAt: null,
      duration: null,
      transcript: null,
      showNotes: null,
      keywords: [] as string[],
      platform: "transistor" as const,
    };

    const result = extractVerificationFields(verificationData);

    expect(result).toEqual({
      episodeUrl: null,
      episodePublished: false,
      publishedAt: null,
      adDurationSeconds: null,
      transcript: null,
      showNotes: null,
      platform: "transistor",
      sourceEpisodeId: "ep-1",
    });
  });
});

describe("parsePlatformFromIntegration edge cases", () => {
  it("returns null for uppercase platform name", () => {
    expect(parsePlatformFromIntegration("SPOTIFY")).toBeNull();
  });

  it("returns null for undefined coerced to string", () => {
    expect(parsePlatformFromIntegration(undefined as unknown as string)).toBeNull();
  });

  it("returns null for numeric string", () => {
    expect(parsePlatformFromIntegration("12345")).toBeNull();
  });

  it("returns null for Buzzsprout with wrong casing", () => {
    expect(parsePlatformFromIntegration("Buzzsprout")).toBeNull();
    expect(parsePlatformFromIntegration("BUZZSPROUT")).toBeNull();
  });

  it("returns null for Transistor with wrong casing", () => {
    expect(parsePlatformFromIntegration("Transistor")).toBeNull();
    expect(parsePlatformFromIntegration("TRANSISTOR")).toBeNull();
  });
});
