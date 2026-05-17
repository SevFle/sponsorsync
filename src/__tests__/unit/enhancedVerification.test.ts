import { describe, it, expect, beforeEach } from "vitest";
import {
  computeEnhancedVerification,
  computeEnhancedBulkVerification,
  getStatusTransition,
  type EnhancedVerificationResult,
  type EnhancedBulkResult,
} from "@/lib/verification/enhancedVerification";
import type { DeliverableVerificationReport } from "@/lib/deliverables/types";
import type { EpisodeData, DeliverableRequirement } from "@/lib/verification/episodeChecker";
import { resetAuditCounter } from "@/lib/verification/verificationAuditLog";

function makeBaseReport(
  overrides: Partial<DeliverableVerificationReport> = {}
): DeliverableVerificationReport {
  return {
    deliverableId: "del-1",
    deliverableTitle: "Ad Read",
    deliverableType: "ad_read",
    dealId: "deal-1",
    dealTitle: "Test Deal",
    overallStatus: "pending",
    checks: [],
    dueDate: null,
    deadlineStatus: "no_deadline",
    verifiedAt: new Date(),
    summary: "Ad Read: Verification pending — deadline: no deadline set",
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<EpisodeData> = {}): EpisodeData {
  return {
    id: "ep-1",
    title: "Sponsored Episode",
    description: "An episode with a sponsor read",
    publishedAt: "2026-05-10T10:00:00Z",
    durationSeconds: 1800,
    url: "https://podcast.com/ep1",
    transcript: null,
    ...overrides,
  };
}

function makeRequirement(
  overrides: Partial<DeliverableRequirement> = {}
): DeliverableRequirement {
  return {
    id: "del-1",
    title: "Mid-roll Ad Read",
    sponsorName: "Acme Corp",
    requiredPlacement: null,
    dueDate: "2026-06-01",
    ...overrides,
  };
}

describe("computeEnhancedVerification", () => {
  beforeEach(() => {
    resetAuditCounter();
  });

  it("returns enhanced result with episode check when episodes provided", () => {
    const episodes = [
      makeEpisode({
        transcript:
          "This episode is sponsored by Acme Corp. Brought to you by Acme Corp.",
      }),
    ];
    const report = makeBaseReport({ overallStatus: "pending" });
    const requirement = makeRequirement({ sponsorName: "Acme Corp" });

    const result = computeEnhancedVerification(
      report,
      episodes,
      requirement,
      "user-1"
    );

    expect(result.baseReport).toBe(report);
    expect(result.episodeCheck).not.toBeNull();
    expect(result.episodeCheck!.episodeId).toBe("ep-1");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.auditEntry).toBeDefined();
    expect(result.auditEntry.deliverableId).toBe("del-1");
  });

  it("returns null episodeCheck when no episodes", () => {
    const report = makeBaseReport({ overallStatus: "pending" });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.episodeCheck).toBeNull();
  });

  it("sets auto_complete when base report passes without episodes", () => {
    const report = makeBaseReport({ overallStatus: "pass" });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.confidence).toBe(0.9);
    expect(result.recommendedAction).toBe("auto_complete");
  });

  it("sets verification_failed when base report is pending without episodes", () => {
    const report = makeBaseReport({ overallStatus: "pending" });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.confidence).toBe(0.2);
    expect(result.recommendedAction).toBe("verification_failed");
  });

  it("sets verification_failed when base report fails without episodes", () => {
    const report = makeBaseReport({ overallStatus: "fail" });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.confidence).toBe(0.1);
    expect(result.recommendedAction).toBe("verification_failed");
  });

  it("overrides to overdue_alert when deadline is overdue without episodes", () => {
    const report = makeBaseReport({
      overallStatus: "pending",
      deadlineStatus: "overdue",
    });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.recommendedAction).toBe("overdue_alert");
  });

  it("overrides to overdue_alert even when base passes but is overdue with no episodes", () => {
    const report = makeBaseReport({
      overallStatus: "pass",
      deadlineStatus: "overdue",
    });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.recommendedAction).toBe("overdue_alert");
  });

  it("uses episode check confidence when episodes available", () => {
    const episodes = [
      makeEpisode({
        transcript:
          "This episode is sponsored by Acme Corp. Brought to you by Acme Corp. Made possible by Acme Corp.",
        durationSeconds: 1800,
      }),
    ];
    const report = makeBaseReport({ overallStatus: "pending" });
    const requirement = makeRequirement({
      sponsorName: "Acme Corp",
      requiredPlacement: "mid_roll",
    });

    const result = computeEnhancedVerification(
      report,
      episodes,
      requirement,
      "user-1"
    );

    expect(result.confidence).toBe(result.episodeCheck!.overallConfidence);
    expect(result.recommendedAction).toBe(
      result.episodeCheck!.recommendation as "auto_complete"
    );
  });

  it("creates audit entry with correct metadata", () => {
    const report = makeBaseReport({
      overallStatus: "pass",
      deadlineStatus: "on_track",
    });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.auditEntry.userId).toBe("user-1");
    expect(result.auditEntry.metadata).toEqual(
      expect.objectContaining({
        baseStatus: "pass",
        deadlineStatus: "on_track",
        checksCount: 0,
      })
    );
  });

  it("creates audit entry with new status verified when auto_complete", () => {
    const report = makeBaseReport({ overallStatus: "pass" });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.auditEntry.newStatus).toBe("verified");
  });

  it("creates audit entry with null new status when not auto_complete", () => {
    const report = makeBaseReport({ overallStatus: "pending" });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.auditEntry.newStatus).toBeNull();
  });

  it("records previous status from base report", () => {
    const report = makeBaseReport({ overallStatus: "fail" });
    const requirement = makeRequirement();

    const result = computeEnhancedVerification(
      report,
      [],
      requirement,
      "user-1"
    );

    expect(result.auditEntry.previousStatus).toBe("fail");
  });

  it("records keyword counts from episode check", () => {
    const episodes = [
      makeEpisode({
        transcript: "Acme Corp is our sponsor today",
      }),
    ];
    const report = makeBaseReport();
    const requirement = makeRequirement({ sponsorName: "Acme Corp" });

    const result = computeEnhancedVerification(
      report,
      episodes,
      requirement,
      "user-1"
    );

    expect(result.auditEntry.keywordMatchCount).toBeGreaterThanOrEqual(0);
    expect(result.auditEntry.keywordTotalCount).toBeGreaterThanOrEqual(0);
  });

  it("handles episode with no transcript", () => {
    const episodes = [makeEpisode({ transcript: null })];
    const report = makeBaseReport();
    const requirement = makeRequirement({ sponsorName: "Acme Corp" });

    const result = computeEnhancedVerification(
      report,
      episodes,
      requirement,
      "user-1"
    );

    expect(result.episodeCheck).not.toBeNull();
    expect(result.confidence).toBe(0);
  });
});

describe("computeEnhancedBulkVerification", () => {
  beforeEach(() => {
    resetAuditCounter();
  });

  it("returns empty results for empty input", () => {
    const result = computeEnhancedBulkVerification([], [], "user-1");

    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.totalEntries).toBe(0);
  });

  it("processes multiple base reports", () => {
    const reports = [
      makeBaseReport({
        deliverableId: "del-1",
        overallStatus: "pass",
      }),
      makeBaseReport({
        deliverableId: "del-2",
        overallStatus: "pending",
      }),
    ];
    const episodePairs = [
      {
        deliverableId: "del-1",
        episodes: [],
        requirement: makeRequirement({ id: "del-1" }),
      },
      {
        deliverableId: "del-2",
        episodes: [],
        requirement: makeRequirement({ id: "del-2" }),
      },
    ];

    const result = computeEnhancedBulkVerification(
      reports,
      episodePairs,
      "user-1"
    );

    expect(result.results).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("uses default requirement when pair not found", () => {
    const reports = [
      makeBaseReport({
        deliverableId: "del-1",
        overallStatus: "pass",
      }),
    ];

    const result = computeEnhancedBulkVerification(reports, [], "user-1");

    expect(result.results).toHaveLength(1);
    expect(result.results[0].baseReport.deliverableId).toBe("del-1");
  });

  it("captures errors gracefully", () => {
    const reports = [
      makeBaseReport({ deliverableId: "del-1", overallStatus: "pass" }),
      makeBaseReport({ deliverableId: "del-2", overallStatus: "pending" }),
    ];
    const episodePairs = [
      {
        deliverableId: "del-1",
        episodes: [],
        requirement: makeRequirement({ id: "del-1" }),
      },
    ];

    const result = computeEnhancedBulkVerification(
      reports,
      episodePairs,
      "user-1"
    );

    expect(result.results).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("provides audit summary counts", () => {
    const reports = [
      makeBaseReport({
        deliverableId: "del-1",
        overallStatus: "pass",
      }),
      makeBaseReport({
        deliverableId: "del-2",
        overallStatus: "pending",
      }),
    ];

    const result = computeEnhancedBulkVerification(reports, [], "user-1");

    expect(result.totalEntries).toBe(2);
    expect(result.autoCompleted + result.manualReview + result.failed + result.overdueAlerts).toBeLessThanOrEqual(2);
  });

  it("handles reports with episodes for some deliverables", () => {
    const reports = [
      makeBaseReport({ deliverableId: "del-1", overallStatus: "pending" }),
      makeBaseReport({ deliverableId: "del-2", overallStatus: "pending" }),
    ];
    const episodePairs = [
      {
        deliverableId: "del-1",
        episodes: [
          makeEpisode({
            transcript:
              "This episode is sponsored by Acme Corp. Brought to you by Acme Corp.",
          }),
        ],
        requirement: makeRequirement({
          id: "del-1",
          sponsorName: "Acme Corp",
        }),
      },
    ];

    const result = computeEnhancedBulkVerification(
      reports,
      episodePairs,
      "user-1"
    );

    expect(result.results).toHaveLength(2);
    const withEp = result.results.find(
      (r) => r.baseReport.deliverableId === "del-1"
    );
    const withoutEp = result.results.find(
      (r) => r.baseReport.deliverableId === "del-2"
    );
    expect(withEp!.episodeCheck).not.toBeNull();
    expect(withoutEp!.episodeCheck).toBeNull();
  });

  it("includes entries in summary", () => {
    const reports = [
      makeBaseReport({ deliverableId: "del-1", overallStatus: "pass" }),
    ];

    const result = computeEnhancedBulkVerification(reports, [], "user-1");

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].deliverableId).toBe("del-1");
  });
});

describe("getStatusTransition", () => {
  it("transitions to verified on auto_complete", () => {
    expect(getStatusTransition("pending", "auto_complete")).toBe("verified");
    expect(getStatusTransition("in_progress", "auto_complete")).toBe("verified");
  });

  it("transitions to in_progress on manual_review (from non-verified)", () => {
    expect(getStatusTransition("pending", "manual_review")).toBe("in_progress");
    expect(getStatusTransition("in_progress", "manual_review")).toBe("in_progress");
  });

  it("returns null on manual_review when already verified", () => {
    expect(getStatusTransition("verified", "manual_review")).toBeNull();
  });

  it("transitions to missed on overdue_alert (from non-missed)", () => {
    expect(getStatusTransition("pending", "overdue_alert")).toBe("missed");
    expect(getStatusTransition("in_progress", "overdue_alert")).toBe("missed");
  });

  it("returns null on overdue_alert when already missed", () => {
    expect(getStatusTransition("missed", "overdue_alert")).toBeNull();
  });

  it("returns null for verification_failed", () => {
    expect(getStatusTransition("pending", "verification_failed")).toBeNull();
    expect(getStatusTransition("in_progress", "verification_failed")).toBeNull();
  });

  it("returns null for verification_passed", () => {
    expect(getStatusTransition("pending", "verification_passed")).toBeNull();
  });

  it("handles all status combinations", () => {
    const statuses = ["pending", "in_progress", "submitted", "verified", "missed"];
    const actions: Array<"auto_complete" | "manual_review" | "overdue_alert" | "verification_failed" | "verification_passed"> = [
      "auto_complete",
      "manual_review",
      "overdue_alert",
      "verification_failed",
      "verification_passed",
    ];

    for (const status of statuses) {
      for (const action of actions) {
        const result = getStatusTransition(status, action);
        expect(result === null || typeof result === "string").toBe(true);
      }
    }
  });
});
