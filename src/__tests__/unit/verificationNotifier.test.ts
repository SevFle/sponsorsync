import { describe, it, expect } from "vitest";
import {
  determineVerificationAction,
  buildVerificationNotification,
  buildBulkVerificationNotifications,
  shouldAutoComplete,
  shouldManualReview,
  type VerificationAction,
} from "@/lib/verification/verificationNotifier";
import type { EpisodeCheckResult } from "@/lib/verification/episodeChecker";

function makeEpisodeResult(
  overrides: Partial<EpisodeCheckResult> = {}
): EpisodeCheckResult {
  return {
    episodeId: "ep-1",
    deliverableId: "del-1",
    overallConfidence: 0.9,
    keywordMatch: null,
    timestampAnalysis: null,
    recommendation: "auto_complete",
    summary: 'Episode "Test Episode" vs deliverable "Ad Read"; Confidence: 90%',
    ...overrides,
  };
}

describe("determineVerificationAction", () => {
  it("returns auto_complete for high confidence", () => {
    const action = determineVerificationAction(0.9, false, true);
    expect(action).toBe("auto_complete");
  });

  it("returns auto_complete at exactly 0.85 threshold", () => {
    const action = determineVerificationAction(0.85, false, true);
    expect(action).toBe("auto_complete");
  });

  it("returns manual_review for moderate confidence", () => {
    const action = determineVerificationAction(0.7, false, true);
    expect(action).toBe("manual_review");
  });

  it("returns manual_review at exactly 0.5 threshold", () => {
    const action = determineVerificationAction(0.5, false, true);
    expect(action).toBe("manual_review");
  });

  it("returns verification_failed for low confidence above 0", () => {
    const action = determineVerificationAction(0.3, false, true);
    expect(action).toBe("verification_failed");
  });

  it("returns verification_failed for zero confidence", () => {
    const action = determineVerificationAction(0, false, true);
    expect(action).toBe("verification_failed");
  });

  it("returns overdue_alert when overdue with no episode", () => {
    const action = determineVerificationAction(0, true, false);
    expect(action).toBe("overdue_alert");
  });

  it("returns overdue_alert even with some confidence when overdue and no episode", () => {
    const action = determineVerificationAction(0.7, true, false);
    expect(action).toBe("overdue_alert");
  });

  it("returns auto_complete when overdue but episode exists", () => {
    const action = determineVerificationAction(0.9, true, true);
    expect(action).toBe("auto_complete");
  });

  it("returns manual_review when overdue but episode exists at moderate confidence", () => {
    const action = determineVerificationAction(0.6, true, true);
    expect(action).toBe("manual_review");
  });

  it("returns verification_failed when overdue with episode at low confidence", () => {
    const action = determineVerificationAction(0.2, true, true);
    expect(action).toBe("verification_failed");
  });

  it("boundary: confidence just above 0.85", () => {
    const action = determineVerificationAction(0.86, false, true);
    expect(action).toBe("auto_complete");
  });

  it("boundary: confidence just below 0.85", () => {
    const action = determineVerificationAction(0.84, false, true);
    expect(action).toBe("manual_review");
  });

  it("boundary: confidence just below 0.5", () => {
    const action = determineVerificationAction(0.49, false, true);
    expect(action).toBe("verification_failed");
  });

  it("perfect confidence score of 1.0", () => {
    const action = determineVerificationAction(1.0, false, true);
    expect(action).toBe("auto_complete");
  });
});

describe("buildVerificationNotification", () => {
  it("builds auto_complete notification", () => {
    const result = makeEpisodeResult({
      overallConfidence: 0.92,
      recommendation: "auto_complete",
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Acme Sponsorship"
    );

    expect(notification.userId).toBe("user-1");
    expect(notification.deliverableId).toBe("del-1");
    expect(notification.dealId).toBe("deal-1");
    expect(notification.action).toBe("auto_complete");
    expect(notification.confidence).toBe(0.92);
    expect(notification.title).toBe("Deliverable Auto-Verified");
    expect(notification.message).toContain("92%");
    expect(notification.message).toContain("Acme Sponsorship");
  });

  it("builds manual_review notification", () => {
    const result = makeEpisodeResult({
      overallConfidence: 0.6,
      recommendation: "manual_review",
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Big Deal"
    );

    expect(notification.action).toBe("manual_review");
    expect(notification.title).toBe("Manual Review Required");
    expect(notification.message).toContain("60%");
    expect(notification.message).toContain("Big Deal");
  });

  it("builds overdue_alert notification", () => {
    const result = makeEpisodeResult({
      episodeId: null,
      overallConfidence: 0,
      recommendation: "overdue_no_episode",
      summary: 'Deliverable "Mid-roll" is overdue with no matching episode published',
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Late Deal"
    );

    expect(notification.action).toBe("overdue_alert");
    expect(notification.title).toBe("Overdue Deliverable — No Episode Found");
    expect(notification.message).toContain("overdue");
    expect(notification.episodeTitle).toBeNull();
  });

  it("builds verification_failed notification", () => {
    const result = makeEpisodeResult({
      overallConfidence: 0.2,
      recommendation: "not_found",
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Failed Deal"
    );

    expect(notification.action).toBe("verification_failed");
    expect(notification.title).toBe("Verification Failed");
    expect(notification.message).toContain("20%");
  });

  it("handles null dealId", () => {
    const result = makeEpisodeResult();
    const notification = buildVerificationNotification(
      "user-1",
      result,
      null,
      "Some Deal"
    );
    expect(notification.dealId).toBeNull();
  });

  it("handles null dealTitle", () => {
    const result = makeEpisodeResult();
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      null
    );
    expect(notification.message).toContain("Unknown");
  });

  it("extracts episode title from summary", () => {
    const result = makeEpisodeResult({
      summary: 'Episode "The Big Show" vs deliverable "Ad Read"; Confidence: 90%',
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Deal"
    );
    expect(notification.episodeTitle).toBe("The Big Show");
  });

  it("extracts deliverable title from summary", () => {
    const result = makeEpisodeResult({
      summary:
        'Episode "Test Ep" vs deliverable "Mid-roll Ad"; Confidence: 90%',
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Deal"
    );
    expect(notification.deliverableTitle).toBe("Mid-roll Ad");
  });

  it("falls back to deliverableId when no title in summary", () => {
    const result = makeEpisodeResult({
      summary: "No quoted content here",
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Deal"
    );
    expect(notification.deliverableTitle).toBe("del-1");
  });

  it("sets episodeTitle to null when no episodeId", () => {
    const result = makeEpisodeResult({
      episodeId: null,
      summary: "No episode found",
    });
    const notification = buildVerificationNotification(
      "user-1",
      result,
      "deal-1",
      "Deal"
    );
    expect(notification.episodeTitle).toBeNull();
  });
});

describe("buildBulkVerificationNotifications", () => {
  it("builds notifications for multiple results", () => {
    const results = [
      makeEpisodeResult({
        deliverableId: "del-1",
        overallConfidence: 0.9,
        recommendation: "auto_complete",
      }),
      makeEpisodeResult({
        deliverableId: "del-2",
        overallConfidence: 0.3,
        recommendation: "not_found",
      }),
    ];

    const dealMap = new Map<string, string>();
    dealMap.set("del-1", "Deal A");
    dealMap.set("del-2", "Deal B");

    const notifications = buildBulkVerificationNotifications(
      "user-1",
      results,
      dealMap
    );

    expect(notifications).toHaveLength(2);
    expect(notifications[0].deliverableId).toBe("del-1");
    expect(notifications[1].deliverableId).toBe("del-2");
    expect(notifications[0].action).toBe("auto_complete");
    expect(notifications[1].action).toBe("verification_failed");
  });

  it("handles empty results array", () => {
    const notifications = buildBulkVerificationNotifications(
      "user-1",
      [],
      new Map()
    );
    expect(notifications).toEqual([]);
  });

  it("handles missing deal title in map", () => {
    const results = [
      makeEpisodeResult({ deliverableId: "del-1" }),
    ];

    const notifications = buildBulkVerificationNotifications(
      "user-1",
      results,
      new Map()
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain("Unknown");
  });

  it("uses deliverableId as dealId when not in map", () => {
    const results = [
      makeEpisodeResult({ deliverableId: "del-1" }),
    ];

    const notifications = buildBulkVerificationNotifications(
      "user-1",
      results,
      new Map()
    );

    expect(notifications[0].dealId).toBe("del-1");
  });

  it("produces consistent notification structure", () => {
    const results = [
      makeEpisodeResult({ deliverableId: "del-1" }),
    ];
    const dealMap = new Map([["del-1", "Test Deal"]]);

    const [notification] = buildBulkVerificationNotifications(
      "user-1",
      results,
      dealMap
    );

    expect(notification).toHaveProperty("userId");
    expect(notification).toHaveProperty("deliverableId");
    expect(notification).toHaveProperty("dealId");
    expect(notification).toHaveProperty("action");
    expect(notification).toHaveProperty("confidence");
    expect(notification).toHaveProperty("title");
    expect(notification).toHaveProperty("message");
    expect(notification).toHaveProperty("episodeTitle");
    expect(notification).toHaveProperty("deliverableTitle");
  });
});

describe("shouldAutoComplete", () => {
  it("returns true at threshold 0.85", () => {
    expect(shouldAutoComplete(0.85)).toBe(true);
  });

  it("returns true above threshold", () => {
    expect(shouldAutoComplete(0.99)).toBe(true);
    expect(shouldAutoComplete(1.0)).toBe(true);
  });

  it("returns false below threshold", () => {
    expect(shouldAutoComplete(0.84)).toBe(false);
    expect(shouldAutoComplete(0.5)).toBe(false);
    expect(shouldAutoComplete(0)).toBe(false);
  });
});

describe("shouldManualReview", () => {
  it("returns true for confidence in [0.5, 0.85)", () => {
    expect(shouldManualReview(0.5)).toBe(true);
    expect(shouldManualReview(0.7)).toBe(true);
    expect(shouldManualReview(0.84)).toBe(true);
  });

  it("returns false at auto_complete threshold", () => {
    expect(shouldManualReview(0.85)).toBe(false);
  });

  it("returns false below manual review threshold", () => {
    expect(shouldManualReview(0.49)).toBe(false);
    expect(shouldManualReview(0)).toBe(false);
  });

  it("returns false for high confidence", () => {
    expect(shouldManualReview(0.99)).toBe(false);
  });
});
