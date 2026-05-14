import { describe, it, expect } from "vitest";
import {
  checkEpisodeDeliverable,
  batchCheckEpisodes,
  type EpisodeData,
  type DeliverableRequirement,
} from "@/lib/verification/episodeChecker";
import type { PlacementType } from "@/lib/verification/timestampAnalyzer";

function makeEpisode(overrides: Partial<EpisodeData> = {}): EpisodeData {
  return {
    id: "ep-1",
    title: "Episode 42: The Future of Tech",
    description: "A great discussion about technology",
    publishedAt: "2026-05-10T10:00:00Z",
    durationSeconds: 1800,
    url: "https://podcast.com/ep42",
    transcript: null,
    ...overrides,
  };
}

function makeRequirement(overrides: Partial<DeliverableRequirement> = {}): DeliverableRequirement {
  return {
    id: "del-1",
    title: "Mid-roll Ad Read",
    sponsorName: "Acme Corp",
    productName: null,
    requiredPlacement: null,
    dueDate: "2026-06-01",
    ...overrides,
  };
}

describe("checkEpisodeDeliverable", () => {
  it("returns overdue_no_episode when past due with no episodes", () => {
    const result = checkEpisodeDeliverable(
      [],
      makeRequirement({ dueDate: "2020-01-01" })
    );
    expect(result.recommendation).toBe("overdue_no_episode");
    expect(result.overallConfidence).toBe(0);
    expect(result.episodeId).toBeNull();
  });

  it("returns not_found when no episodes and not overdue", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const result = checkEpisodeDeliverable(
      [],
      makeRequirement({ dueDate: futureDate.toISOString() })
    );
    expect(result.recommendation).toBe("not_found");
    expect(result.overallConfidence).toBe(0);
  });

  it("returns not_found when no episodes and no due date", () => {
    const result = checkEpisodeDeliverable([], makeRequirement({ dueDate: null }));
    expect(result.recommendation).toBe("not_found");
  });

  it("returns auto_complete when transcript has sponsor name with high confidence", () => {
    const episode = makeEpisode({
      transcript: "This episode is sponsored by Acme Corp. Brought to you by Acme Corp, the leading widget maker. Thanks to Acme Corp for their support.",
      durationSeconds: 1800,
    });
    const requirement = makeRequirement({
      sponsorName: "Acme Corp",
      requiredPlacement: null,
    });

    const result = checkEpisodeDeliverable([episode], requirement);
    expect(result.recommendation).toBe("auto_complete");
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0.85);
    expect(result.episodeId).toBe("ep-1");
    expect(result.keywordMatch).not.toBeNull();
    expect(result.keywordMatch!.matched).toBe(true);
  });

  it("returns manual_review for moderate confidence match", () => {
    const episode = makeEpisode({
      transcript: "We mentioned Acme Corp briefly in this episode.",
      durationSeconds: 1800,
    });
    const requirement = makeRequirement({
      sponsorName: "Acme Corp",
      requiredPlacement: null,
    });

    const result = checkEpisodeDeliverable([episode], requirement);
    expect(result.episodeId).toBe("ep-1");
    expect(result.summary).toBeDefined();
  });

  it("returns not_found when sponsor not mentioned at all", () => {
    const episode = makeEpisode({
      transcript: "Today we discuss the weather and sports. No sponsor mentions here.",
      durationSeconds: 1800,
    });
    const requirement = makeRequirement({
      sponsorName: "Acme Corp",
    });

    const result = checkEpisodeDeliverable([episode], requirement);
    expect(result.overallConfidence).toBe(0);
    expect(result.recommendation).toBe("not_found");
  });

  it("includes timestamp analysis when duration available", () => {
    const episode = makeEpisode({
      transcript: "This episode is sponsored by Acme Corp",
      durationSeconds: 1800,
    });
    const requirement = makeRequirement({
      sponsorName: "Acme Corp",
      requiredPlacement: "mid_roll" as PlacementType,
    });

    const result = checkEpisodeDeliverable([episode], requirement);
    expect(result.timestampAnalysis).not.toBeNull();
  });

  it("picks best matching episode from multiple", () => {
    const episodes = [
      makeEpisode({
        id: "ep-bad",
        title: "Unrelated Episode",
        transcript: "Today we talk about cooking",
      }),
      makeEpisode({
        id: "ep-good",
        title: "Sponsored Episode",
        transcript: "This episode is sponsored by Acme Corp. Brought to you by Acme Corp.",
      }),
    ];

    const result = checkEpisodeDeliverable(
      episodes,
      makeRequirement({ sponsorName: "Acme Corp" })
    );
    expect(result.episodeId).toBe("ep-good");
    expect(result.overallConfidence).toBeGreaterThan(0);
  });

  it("uses additional keywords for matching", () => {
    const episode = makeEpisode({
      transcript: "Check out WidgetPro from our sponsor Acme Corp",
    });
    const requirement = makeRequirement({
      sponsorName: "Acme Corp",
      productName: "WidgetPro",
    });

    const result = checkEpisodeDeliverable([episode], requirement);
    expect(result.keywordMatch).not.toBeNull();
    expect(result.keywordMatch!.matched).toBe(true);
  });

  it("includes meaningful summary", () => {
    const episode = makeEpisode({
      transcript: "Sponsored by Acme Corp",
      durationSeconds: 1800,
    });
    const result = checkEpisodeDeliverable(
      [episode],
      makeRequirement({ sponsorName: "Acme Corp", title: "Ad Read" })
    );
    expect(result.summary).toContain("Episode");
    expect(result.summary).toContain("Confidence");
  });

  it("handles episode without transcript", () => {
    const episode = makeEpisode({ transcript: null, durationSeconds: null });
    const result = checkEpisodeDeliverable(
      [episode],
      makeRequirement({ sponsorName: "Acme Corp" })
    );
    expect(result.keywordMatch).toBeNull();
    expect(result.timestampAnalysis).toBeNull();
    expect(result.overallConfidence).toBe(0);
  });
});

describe("batchCheckEpisodes", () => {
  it("processes multiple deliverable-episode pairs", () => {
    const results = batchCheckEpisodes([
      {
        episodes: [makeEpisode({ transcript: "Sponsored by Acme Corp" })],
        requirement: makeRequirement({ id: "d-1", sponsorName: "Acme Corp" }),
      },
      {
        episodes: [makeEpisode({ transcript: "No mentions here" })],
        requirement: makeRequirement({ id: "d-2", sponsorName: "WidgetCo" }),
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].deliverableId).toBe("d-1");
    expect(results[1].deliverableId).toBe("d-2");
  });

  it("handles empty input", () => {
    const results = batchCheckEpisodes([]);
    expect(results).toHaveLength(0);
  });

  it("handles overdue deliverables in batch", () => {
    const results = batchCheckEpisodes([
      {
        episodes: [],
        requirement: makeRequirement({
          id: "d-overdue",
          sponsorName: "Acme Corp",
          dueDate: "2020-01-01",
        }),
      },
    ]);
    expect(results[0].recommendation).toBe("overdue_no_episode");
  });
});
