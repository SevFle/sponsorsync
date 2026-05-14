import { describe, it, expect } from "vitest";
import {
  determineVerificationAction,
  buildVerificationNotification,
  shouldAutoComplete,
  shouldManualReview,
  type VerificationAction,
} from "@/lib/verification/verificationNotifier";
import type { EpisodeCheckResult } from "@/lib/verification/episodeChecker";

function makeEpisodeCheckResult(overrides: Partial<EpisodeCheckResult> = {}): EpisodeCheckResult {
  return {
    episodeId: "ep-1",
    deliverableId: "del-1",
    overallConfidence: 0.9,
    keywordMatch: null,
    timestampAnalysis: null,
    recommendation: "auto_complete",
    summary: 'Episode "Episode 1" vs deliverable "Ad Read"; Confidence: 90%; RECOMMENDATION: Auto-complete deliverable',
    ...overrides,
  };
}

describe("determineVerificationAction", () => {
  it("returns overdue_alert for overdue with no episode", () => {
    expect(determineVerificationAction(0, true, false)).toBe("overdue_alert");
  });

  it("returns auto_complete for high confidence", () => {
    expect(determineVerificationAction(0.9, false, true)).toBe("auto_complete");
    expect(determineVerificationAction(0.85, false, true)).toBe("auto_complete");
    expect(determineVerificationAction(1.0, false, true)).toBe("auto_complete");
  });

  it("returns manual_review for moderate confidence", () => {
    expect(determineVerificationAction(0.7, false, true)).toBe("manual_review");
    expect(determineVerificationAction(0.5, false, true)).toBe("manual_review");
  });

  it("returns verification_failed for low confidence", () => {
    expect(determineVerificationAction(0.3, false, true)).toBe("verification_failed");
    expect(determineVerificationAction(0.1, false, true)).toBe("verification_failed");
  });

  it("returns verification_failed for zero confidence", () => {
    expect(determineVerificationAction(0, false, false)).toBe("verification_failed");
  });

  it("prioritizes overdue_alert over other actions", () => {
    expect(determineVerificationAction(0.9, true, false)).toBe("overdue_alert");
  });
});

describe("buildVerificationNotification", () => {
  it("builds auto_complete notification", () => {
    const notification = buildVerificationNotification(
      "user-1",
      makeEpisodeCheckResult({
        overallConfidence: 0.92,
        recommendation: "auto_complete",
      }),
      "deal-1",
      "Big Sponsorship Deal"
    );

    expect(notification.userId).toBe("user-1");
    expect(notification.action).toBe("auto_complete");
    expect(notification.confidence).toBe(0.92);
    expect(notification.title).toContain("Auto-Verified");
    expect(notification.message).toContain("92%");
    expect(notification.message).toContain("Big Sponsorship Deal");
  });

  it("builds manual_review notification", () => {
    const notification = buildVerificationNotification(
      "user-1",
      makeEpisodeCheckResult({
        overallConfidence: 0.65,
        recommendation: "manual_review",
      }),
      "deal-1",
      "Sponsor Deal"
    );

    expect(notification.action).toBe("manual_review");
    expect(notification.title).toContain("Manual Review");
    expect(notification.message).toContain("65%");
  });

  it("builds overdue_alert notification", () => {
    const notification = buildVerificationNotification(
      "user-1",
      makeEpisodeCheckResult({
        episodeId: null,
        overallConfidence: 0,
        recommendation: "overdue_no_episode",
      }),
      "deal-1",
      "Old Deal"
    );

    expect(notification.action).toBe("overdue_alert");
    expect(notification.title).toContain("Overdue");
    expect(notification.episodeTitle).toBeNull();
  });

  it("builds verification_failed notification", () => {
    const notification = buildVerificationNotification(
      "user-1",
      makeEpisodeCheckResult({
        overallConfidence: 0.2,
        recommendation: "not_found",
      }),
      null,
      null
    );

    expect(notification.action).toBe("verification_failed");
    expect(notification.title).toContain("Failed");
    expect(notification.message).toContain("Unknown");
  });

  it("handles null dealTitle", () => {
    const notification = buildVerificationNotification(
      "user-1",
      makeEpisodeCheckResult(),
      null,
      null
    );
    expect(notification.message).toContain("Unknown");
  });
});

describe("shouldAutoComplete", () => {
  it("returns true for confidence >= 0.85", () => {
    expect(shouldAutoComplete(0.85)).toBe(true);
    expect(shouldAutoComplete(0.9)).toBe(true);
    expect(shouldAutoComplete(1.0)).toBe(true);
  });

  it("returns false for confidence < 0.85", () => {
    expect(shouldAutoComplete(0.84)).toBe(false);
    expect(shouldAutoComplete(0.5)).toBe(false);
    expect(shouldAutoComplete(0)).toBe(false);
  });
});

describe("shouldManualReview", () => {
  it("returns true for confidence between 0.5 and 0.85", () => {
    expect(shouldManualReview(0.5)).toBe(true);
    expect(shouldManualReview(0.7)).toBe(true);
    expect(shouldManualReview(0.84)).toBe(true);
  });

  it("returns false for confidence >= 0.85", () => {
    expect(shouldManualReview(0.85)).toBe(false);
    expect(shouldManualReview(1.0)).toBe(false);
  });

  it("returns false for confidence < 0.5", () => {
    expect(shouldManualReview(0.49)).toBe(false);
    expect(shouldManualReview(0)).toBe(false);
  });
});
