import { describe, it, expect, beforeEach } from "vitest";
import {
  createAuditEntry,
  summarizeAuditEntries,
  formatAuditEntry,
  resetAuditCounter,
  type VerificationAuditEntry,
} from "@/lib/verification/verificationAuditLog";
import type { VerificationAction } from "@/lib/verification/verificationNotifier";

describe("createAuditEntry", () => {
  beforeEach(() => {
    resetAuditCounter();
  });

  it("creates entry with required fields", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: "deal-1",
      userId: "user-1",
      episodeId: "ep-1",
      action: "auto_complete",
      confidence: 0.9,
    });

    expect(entry.id).toMatch(/^audit_/);
    expect(entry.deliverableId).toBe("del-1");
    expect(entry.dealId).toBe("deal-1");
    expect(entry.userId).toBe("user-1");
    expect(entry.episodeId).toBe("ep-1");
    expect(entry.action).toBe("auto_complete");
    expect(entry.confidence).toBe(0.9);
    expect(entry.placement).toBeNull();
    expect(entry.keywordMatchCount).toBe(0);
    expect(entry.keywordTotalCount).toBe(0);
    expect(entry.previousStatus).toBeNull();
    expect(entry.newStatus).toBeNull();
    expect(entry.metadata).toBeNull();
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it("creates entry with all optional fields", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: "deal-1",
      userId: "user-1",
      episodeId: "ep-1",
      action: "manual_review",
      confidence: 0.6,
      placement: "mid_roll",
      keywordMatchCount: 3,
      keywordTotalCount: 5,
      previousStatus: "pending",
      newStatus: "in_progress",
      metadata: { source: "automated" },
    });

    expect(entry.placement).toBe("mid_roll");
    expect(entry.keywordMatchCount).toBe(3);
    expect(entry.keywordTotalCount).toBe(5);
    expect(entry.previousStatus).toBe("pending");
    expect(entry.newStatus).toBe("in_progress");
    expect(entry.metadata).toEqual({ source: "automated" });
  });

  it("handles null dealId", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "verification_failed",
      confidence: 0.2,
    });

    expect(entry.dealId).toBeNull();
    expect(entry.episodeId).toBeNull();
  });

  it("generates unique IDs for sequential entries", () => {
    const entry1 = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 0.9,
    });
    const entry2 = createAuditEntry({
      deliverableId: "del-2",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "manual_review",
      confidence: 0.6,
    });

    expect(entry1.id).not.toBe(entry2.id);
  });

  it("generates IDs with audit_ prefix", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 0.9,
    });

    expect(entry.id).toMatch(/^audit_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/);
  });

  it("defaults optional fields to null/zero", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 1.0,
    });

    expect(entry.placement).toBeNull();
    expect(entry.keywordMatchCount).toBe(0);
    expect(entry.keywordTotalCount).toBe(0);
    expect(entry.previousStatus).toBeNull();
    expect(entry.newStatus).toBeNull();
    expect(entry.metadata).toBeNull();
  });

  it("handles all action types", () => {
    const actions: VerificationAction[] = [
      "auto_complete",
      "manual_review",
      "overdue_alert",
      "verification_failed",
      "verification_passed",
    ];

    for (const action of actions) {
      const entry = createAuditEntry({
        deliverableId: "del-1",
        dealId: null,
        userId: "user-1",
        episodeId: null,
        action,
        confidence: 0.5,
      });
      expect(entry.action).toBe(action);
    }
  });

  it("handles confidence boundary values", () => {
    const zero = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "verification_failed",
      confidence: 0,
    });
    expect(zero.confidence).toBe(0);

    const one = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 1,
    });
    expect(one.confidence).toBe(1);
  });
});

describe("summarizeAuditEntries", () => {
  it("returns zero summary for empty entries", () => {
    const summary = summarizeAuditEntries([]);
    expect(summary.totalEntries).toBe(0);
    expect(summary.autoCompleted).toBe(0);
    expect(summary.manualReview).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.overdueAlerts).toBe(0);
    expect(summary.entries).toEqual([]);
  });

  it("counts auto_completed entries", () => {
    const entries = [
      makeEntry({ action: "auto_complete" }),
      makeEntry({ action: "auto_complete" }),
      makeEntry({ action: "manual_review" }),
    ];

    const summary = summarizeAuditEntries(entries);
    expect(summary.totalEntries).toBe(3);
    expect(summary.autoCompleted).toBe(2);
    expect(summary.manualReview).toBe(1);
  });

  it("counts failed entries", () => {
    const entries = [
      makeEntry({ action: "verification_failed" }),
      makeEntry({ action: "verification_failed" }),
    ];

    const summary = summarizeAuditEntries(entries);
    expect(summary.failed).toBe(2);
  });

  it("counts overdue_alert entries", () => {
    const entries = [
      makeEntry({ action: "overdue_alert" }),
      makeEntry({ action: "auto_complete" }),
    ];

    const summary = summarizeAuditEntries(entries);
    expect(summary.overdueAlerts).toBe(1);
    expect(summary.autoCompleted).toBe(1);
  });

  it("includes verification_passed in results", () => {
    const entries = [
      makeEntry({ action: "verification_passed" }),
    ];

    const summary = summarizeAuditEntries(entries);
    expect(summary.totalEntries).toBe(1);
    expect(summary.autoCompleted).toBe(0);
    expect(summary.manualReview).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.overdueAlerts).toBe(0);
  });

  it("returns the original entries in summary", () => {
    const entries = [
      makeEntry({ action: "auto_complete", deliverableId: "del-1" }),
      makeEntry({ action: "manual_review", deliverableId: "del-2" }),
    ];

    const summary = summarizeAuditEntries(entries);
    expect(summary.entries).toBe(entries);
    expect(summary.entries[0].deliverableId).toBe("del-1");
    expect(summary.entries[1].deliverableId).toBe("del-2");
  });

  it("handles mixed action types correctly", () => {
    const entries = [
      makeEntry({ action: "auto_complete" }),
      makeEntry({ action: "manual_review" }),
      makeEntry({ action: "verification_failed" }),
      makeEntry({ action: "overdue_alert" }),
      makeEntry({ action: "verification_passed" }),
      makeEntry({ action: "auto_complete" }),
    ];

    const summary = summarizeAuditEntries(entries);
    expect(summary.totalEntries).toBe(6);
    expect(summary.autoCompleted).toBe(2);
    expect(summary.manualReview).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.overdueAlerts).toBe(1);
  });
});

describe("formatAuditEntry", () => {
  it("formats basic entry", () => {
    const entry = makeEntry({
      action: "auto_complete",
      deliverableId: "del-1",
      confidence: 0.9,
      createdAt: new Date("2026-01-15T10:00:00Z"),
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("2026-01-15T10:00:00.000Z");
    expect(formatted).toContain("AUTO_COMPLETE");
    expect(formatted).toContain("deliverable=del-1");
    expect(formatted).toContain("confidence=90%");
  });

  it("includes episode when present", () => {
    const entry = makeEntry({
      action: "manual_review",
      deliverableId: "del-1",
      confidence: 0.6,
      episodeId: "ep-42",
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("episode=ep-42");
  });

  it("omits episode when null", () => {
    const entry = makeEntry({
      action: "auto_complete",
      deliverableId: "del-1",
      confidence: 0.9,
      episodeId: null,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).not.toContain("episode=");
  });

  it("includes status transition when both present", () => {
    const entry = makeEntry({
      action: "auto_complete",
      deliverableId: "del-1",
      confidence: 0.9,
      previousStatus: "pending",
      newStatus: "verified",
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("status: pending→verified");
  });

  it("omits status transition when only previousStatus", () => {
    const entry = makeEntry({
      action: "auto_complete",
      deliverableId: "del-1",
      confidence: 0.9,
      previousStatus: "pending",
      newStatus: null,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).not.toContain("status:");
  });

  it("omits status transition when only newStatus", () => {
    const entry = makeEntry({
      action: "auto_complete",
      deliverableId: "del-1",
      confidence: 0.9,
      previousStatus: null,
      newStatus: "verified",
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).not.toContain("status:");
  });

  it("formats verification_failed action", () => {
    const entry = makeEntry({
      action: "verification_failed",
      deliverableId: "del-1",
      confidence: 0.2,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("VERIFICATION_FAILED");
  });

  it("formats overdue_alert action", () => {
    const entry = makeEntry({
      action: "overdue_alert",
      deliverableId: "del-1",
      confidence: 0,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("OVERDUE_ALERT");
  });

  it("rounds confidence percentage", () => {
    const entry = makeEntry({
      action: "auto_complete",
      deliverableId: "del-1",
      confidence: 0.856,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("confidence=86%");
  });

  it("formats zero confidence", () => {
    const entry = makeEntry({
      action: "verification_failed",
      deliverableId: "del-1",
      confidence: 0,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("confidence=0%");
  });
});

describe("resetAuditCounter", () => {
  it("resets the audit ID counter", () => {
    resetAuditCounter();

    const entry1 = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 0.9,
    });

    resetAuditCounter();

    const entry2 = createAuditEntry({
      deliverableId: "del-2",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 0.9,
    });

    const counter1 = entry1.id.split("_")[2];
    const counter2 = entry2.id.split("_")[2];
    expect(counter1).toBe(counter2);
  });
});

function makeEntry(
  overrides: Partial<VerificationAuditEntry> = {}
): VerificationAuditEntry {
  return {
    id: "audit_test_0001_abcd",
    deliverableId: "del-default",
    dealId: null,
    userId: "user-1",
    episodeId: null,
    action: "auto_complete",
    confidence: 0.9,
    placement: null,
    keywordMatchCount: 0,
    keywordTotalCount: 0,
    previousStatus: null,
    newStatus: null,
    metadata: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}
