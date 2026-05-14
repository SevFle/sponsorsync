import { describe, it, expect, beforeEach } from "vitest";
import {
  createAuditEntry,
  summarizeAuditEntries,
  formatAuditEntry,
  resetAuditCounter,
  type VerificationAuditEntry,
} from "@/lib/verification/verificationAuditLog";

describe("createAuditEntry", () => {
  beforeEach(() => {
    resetAuditCounter();
  });

  it("creates an audit entry with required fields", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: "deal-1",
      userId: "user-1",
      episodeId: "ep-1",
      action: "auto_complete",
      confidence: 0.92,
    });

    expect(entry.id).toMatch(/^audit_/);
    expect(entry.deliverableId).toBe("del-1");
    expect(entry.dealId).toBe("deal-1");
    expect(entry.userId).toBe("user-1");
    expect(entry.episodeId).toBe("ep-1");
    expect(entry.action).toBe("auto_complete");
    expect(entry.confidence).toBe(0.92);
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
      deliverableId: "del-2",
      dealId: null,
      userId: "user-2",
      episodeId: null,
      action: "manual_review",
      confidence: 0.65,
      placement: "mid_roll",
      keywordMatchCount: 2,
      keywordTotalCount: 3,
      previousStatus: "pending",
      newStatus: "in_progress",
      metadata: { source: "automated" },
    });

    expect(entry.dealId).toBeNull();
    expect(entry.episodeId).toBeNull();
    expect(entry.action).toBe("manual_review");
    expect(entry.confidence).toBe(0.65);
    expect(entry.placement).toBe("mid_roll");
    expect(entry.keywordMatchCount).toBe(2);
    expect(entry.keywordTotalCount).toBe(3);
    expect(entry.previousStatus).toBe("pending");
    expect(entry.newStatus).toBe("in_progress");
    expect(entry.metadata).toEqual({ source: "automated" });
  });

  it("generates unique IDs for each entry", () => {
    const entry1 = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 1,
    });
    const entry2 = createAuditEntry({
      deliverableId: "del-2",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "manual_review",
      confidence: 0.5,
    });

    expect(entry1.id).not.toBe(entry2.id);
  });
});

describe("summarizeAuditEntries", () => {
  it("summarizes empty entries", () => {
    const summary = summarizeAuditEntries([]);
    expect(summary.totalEntries).toBe(0);
    expect(summary.autoCompleted).toBe(0);
    expect(summary.manualReview).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.overdueAlerts).toBe(0);
    expect(summary.entries).toHaveLength(0);
  });

  it("counts entries by action type", () => {
    const entries: VerificationAuditEntry[] = [
      createAuditEntry({ deliverableId: "d-1", dealId: null, userId: "u-1", episodeId: null, action: "auto_complete", confidence: 0.9 }),
      createAuditEntry({ deliverableId: "d-2", dealId: null, userId: "u-1", episodeId: null, action: "auto_complete", confidence: 0.95 }),
      createAuditEntry({ deliverableId: "d-3", dealId: null, userId: "u-1", episodeId: null, action: "manual_review", confidence: 0.6 }),
      createAuditEntry({ deliverableId: "d-4", dealId: null, userId: "u-1", episodeId: null, action: "overdue_alert", confidence: 0 }),
      createAuditEntry({ deliverableId: "d-5", dealId: null, userId: "u-1", episodeId: null, action: "verification_failed", confidence: 0.1 }),
    ];

    const summary = summarizeAuditEntries(entries);
    expect(summary.totalEntries).toBe(5);
    expect(summary.autoCompleted).toBe(2);
    expect(summary.manualReview).toBe(1);
    expect(summary.overdueAlerts).toBe(1);
    expect(summary.failed).toBe(1);
  });
});

describe("formatAuditEntry", () => {
  it("formats a basic entry", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 0.92,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("AUTO_COMPLETE");
    expect(formatted).toContain("deliverable=del-1");
    expect(formatted).toContain("confidence=92%");
  });

  it("includes episode ID when present", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: "ep-1",
      action: "auto_complete",
      confidence: 0.88,
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("episode=ep-1");
  });

  it("includes status transition when present", () => {
    const entry = createAuditEntry({
      deliverableId: "del-1",
      dealId: null,
      userId: "user-1",
      episodeId: null,
      action: "auto_complete",
      confidence: 0.9,
      previousStatus: "pending",
      newStatus: "verified",
    });

    const formatted = formatAuditEntry(entry);
    expect(formatted).toContain("pending→verified");
  });
});
