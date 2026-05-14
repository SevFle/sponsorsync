import { describe, it, expect } from "vitest";
import {
  computeEnhancedVerification,
  computeEnhancedBulkVerification,
  getStatusTransition,
} from "@/lib/verification/enhancedVerification";
import { verifyDeliverable, verifyBulkDeliverables, type DeliverableRow } from "@/lib/deliverables/engine";
import type { VerificationContext } from "@/lib/deliverables/types";
import type { EpisodeData, DeliverableRequirement } from "@/lib/verification/episodeChecker";
import type { PlacementType } from "@/lib/verification/timestampAnalyzer";

function makeContext(overrides: Partial<VerificationContext> = {}): VerificationContext {
  return {
    deliverableId: "del-1",
    deliverableTitle: "Ad Read",
    verificationData: null,
    dueDate: null,
    completedDate: null,
    status: "pending",
    notes: null,
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<EpisodeData> = {}): EpisodeData {
  return {
    id: "ep-1",
    title: "Episode 1",
    description: null,
    publishedAt: "2026-05-10T10:00:00Z",
    durationSeconds: 1800,
    url: "https://podcast.com/ep1",
    transcript: null,
    ...overrides,
  };
}

function makeRequirement(overrides: Partial<DeliverableRequirement> = {}): DeliverableRequirement {
  return {
    id: "del-1",
    title: "Ad Read",
    sponsorName: "Acme Corp",
    requiredPlacement: null,
    dueDate: null,
    ...overrides,
  };
}

describe("computeEnhancedVerification", () => {
  it("computes enhanced result with matching episode", () => {
    const baseReport = verifyDeliverable(
      makeContext({ deliverableTitle: "Ad Read", status: "in_progress" }),
      "deal-1",
      "Test Deal"
    );

    const episode = makeEpisode({
      transcript: "This episode is sponsored by Acme Corp. Brought to you by Acme Corp, the leading widget maker.",
      durationSeconds: 1800,
    });

    const requirement = makeRequirement({ sponsorName: "Acme Corp" });

    const result = computeEnhancedVerification(baseReport, [episode], requirement, "user-1");

    expect(result.baseReport).toBe(baseReport);
    expect(result.episodeCheck).not.toBeNull();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.auditEntry).toBeDefined();
    expect(result.auditEntry.userId).toBe("user-1");
    expect(result.auditEntry.action).toBeDefined();
  });

  it("falls back to base report without episodes", () => {
    const baseReport = verifyDeliverable(
      makeContext({ deliverableTitle: "Ad Read", status: "verified" }),
      "deal-1",
      "Test Deal"
    );

    const result = computeEnhancedVerification(
      baseReport,
      [],
      makeRequirement(),
      "user-1"
    );

    expect(result.episodeCheck).toBeNull();
    expect(result.confidence).toBe(0.9);
    expect(result.recommendedAction).toBe("auto_complete");
  });

  it("detects overdue from base report", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const baseReport = verifyDeliverable(
      makeContext({
        deliverableTitle: "Ad Read",
        status: "pending",
        dueDate: pastDate.toISOString(),
      }),
      "deal-1",
      "Test Deal"
    );

    const result = computeEnhancedVerification(
      baseReport,
      [],
      makeRequirement(),
      "user-1"
    );

    expect(result.recommendedAction).toBe("overdue_alert");
  });

  it("creates proper audit entry for auto-complete", () => {
    const baseReport = verifyDeliverable(
      makeContext({ deliverableTitle: "Ad Read", status: "verified" }),
      "deal-1",
      "Test Deal"
    );

    const result = computeEnhancedVerification(
      baseReport,
      [],
      makeRequirement(),
      "user-1"
    );

    expect(result.auditEntry.action).toBe("auto_complete");
    expect(result.auditEntry.newStatus).toBe("verified");
    expect(result.auditEntry.confidence).toBeGreaterThan(0);
  });
});

describe("computeEnhancedBulkVerification", () => {
  it("processes multiple deliverables", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);

    const baseReports = [
      verifyDeliverable(
        makeContext({
          deliverableId: "del-1",
          deliverableTitle: "Ad Read",
          status: "verified",
          dueDate: future.toISOString(),
        }),
        "deal-1",
        "Deal A"
      ),
      verifyDeliverable(
        makeContext({
          deliverableId: "del-2",
          deliverableTitle: "Link Placement",
          status: "pending",
          dueDate: future.toISOString(),
        }),
        "deal-2",
        "Deal B"
      ),
    ];

    const episodePairs = [
      {
        deliverableId: "del-1",
        episodes: [makeEpisode({
          transcript: "Sponsored by Acme Corp. Brought to you by Acme Corp.",
        })],
        requirement: makeRequirement({ id: "del-1", sponsorName: "Acme Corp" }),
      },
      {
        deliverableId: "del-2",
        episodes: [makeEpisode({ transcript: "No mentions here" })],
        requirement: makeRequirement({ id: "del-2", sponsorName: "WidgetCo" }),
      },
    ];

    const result = computeEnhancedBulkVerification(baseReports, episodePairs, "user-1");

    expect(result.results).toHaveLength(2);
    expect(result.totalEntries).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.results[0].auditEntry).toBeDefined();
    expect(result.results[1].auditEntry).toBeDefined();
  });

  it("handles empty input", () => {
    const result = computeEnhancedBulkVerification([], [], "user-1");
    expect(result.results).toHaveLength(0);
    expect(result.totalEntries).toBe(0);
  });

  it("handles errors for individual deliverables gracefully", () => {
    const validReport = verifyDeliverable(
      makeContext({ deliverableId: "del-1", deliverableTitle: "Ad Read", status: "pending" }),
      "deal-1",
      "Deal"
    );

    const result = computeEnhancedBulkVerification(
      [validReport],
      [],
      "user-1"
    );

    expect(result.results).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});

describe("getStatusTransition", () => {
  it("transitions to verified for auto_complete", () => {
    expect(getStatusTransition("pending", "auto_complete")).toBe("verified");
    expect(getStatusTransition("in_progress", "auto_complete")).toBe("verified");
  });

  it("transitions to in_progress for manual_review", () => {
    expect(getStatusTransition("pending", "manual_review")).toBe("in_progress");
  });

  it("returns null for already verified with manual_review", () => {
    expect(getStatusTransition("verified", "manual_review")).toBeNull();
  });

  it("transitions to missed for overdue_alert", () => {
    expect(getStatusTransition("pending", "overdue_alert")).toBe("missed");
    expect(getStatusTransition("in_progress", "overdue_alert")).toBe("missed");
  });

  it("returns null for already missed with overdue_alert", () => {
    expect(getStatusTransition("missed", "overdue_alert")).toBeNull();
  });

  it("returns null for verification_failed", () => {
    expect(getStatusTransition("pending", "verification_failed")).toBeNull();
  });
});
