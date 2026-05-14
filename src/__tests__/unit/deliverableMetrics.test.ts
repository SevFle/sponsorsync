import { describe, it, expect } from "vitest";
import {
  computeStatusCounts,
  computeDeliverableMetrics,
  getStatusColor,
} from "@/lib/analytics/deliverableMetrics";
import type { DeliverableLike } from "@/lib/analytics/deliverableMetrics";

describe("computeStatusCounts", () => {
  it("returns zero counts for empty array", () => {
    const counts = computeStatusCounts([]);
    expect(counts).toEqual({
      pending: 0,
      in_progress: 0,
      submitted: 0,
      verified: 0,
      missed: 0,
    });
  });

  it("counts each status correctly", () => {
    const deliverables: DeliverableLike[] = [
      { status: "pending", dueDate: null, completedDate: null },
      { status: "pending", dueDate: null, completedDate: null },
      { status: "in_progress", dueDate: null, completedDate: null },
      { status: "submitted", dueDate: null, completedDate: null },
      { status: "verified", dueDate: null, completedDate: null },
      { status: "verified", dueDate: null, completedDate: null },
      { status: "verified", dueDate: null, completedDate: null },
      { status: "missed", dueDate: null, completedDate: null },
    ];

    const counts = computeStatusCounts(deliverables);
    expect(counts.pending).toBe(2);
    expect(counts.in_progress).toBe(1);
    expect(counts.submitted).toBe(1);
    expect(counts.verified).toBe(3);
    expect(counts.missed).toBe(1);
  });

  it("ignores unknown statuses", () => {
    const deliverables: DeliverableLike[] = [
      { status: "unknown_status" as DeliverableLike["status"], dueDate: null, completedDate: null },
    ];

    const counts = computeStatusCounts(deliverables);
    expect(counts.pending).toBe(0);
    expect(counts.verified).toBe(0);
  });
});

describe("computeDeliverableMetrics", () => {
  it("returns zero metrics for empty array", () => {
    const result = computeDeliverableMetrics([]);

    expect(result.total).toBe(0);
    expect(result.completionRate).toBe(0);
    expect(result.onTimeRate).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(result.verifiedCount).toBe(0);
    expect(result.missedCount).toBe(0);
  });

  it("computes completion rate", () => {
    const deliverables: DeliverableLike[] = [
      { status: "verified", dueDate: "2025-01-01", completedDate: "2025-01-01" },
      { status: "verified", dueDate: "2025-01-01", completedDate: "2025-01-01" },
      { status: "pending", dueDate: "2025-01-01", completedDate: null },
      { status: "missed", dueDate: "2025-01-01", completedDate: null },
    ];

    const result = computeDeliverableMetrics(deliverables);
    expect(result.completionRate).toBe(50);
    expect(result.total).toBe(4);
  });

  it("computes on-time rate for verified deliverables", () => {
    const deliverables: DeliverableLike[] = [
      { status: "verified", dueDate: "2025-01-10", completedDate: "2025-01-05" },
      { status: "verified", dueDate: "2025-01-10", completedDate: "2025-01-15" },
      { status: "verified", dueDate: "2025-01-10", completedDate: "2025-01-10" },
    ];

    const result = computeDeliverableMetrics(deliverables);
    expect(result.onTimeRate).toBeCloseTo(66.7, 0);
  });

  it("counts overdue deliverables", () => {
    const deliverables: DeliverableLike[] = [
      { status: "pending", dueDate: "2020-01-01", completedDate: null },
      { status: "in_progress", dueDate: "2020-01-01", completedDate: null },
      { status: "pending", dueDate: "2099-01-01", completedDate: null },
    ];

    const result = computeDeliverableMetrics(deliverables);
    expect(result.overdueCount).toBe(2);
  });

  it("excludes verified and missed from overdue count", () => {
    const deliverables: DeliverableLike[] = [
      { status: "verified", dueDate: "2020-01-01", completedDate: "2020-01-01" },
      { status: "missed", dueDate: "2020-01-01", completedDate: null },
    ];

    const result = computeDeliverableMetrics(deliverables);
    expect(result.overdueCount).toBe(0);
  });

  it("filters by date range", () => {
    const deliverables: DeliverableLike[] = [
      { status: "verified", dueDate: "2025-01-15", completedDate: "2025-01-15" },
      { status: "pending", dueDate: "2025-03-15", completedDate: null },
    ];

    const range = { from: new Date("2025-01-01"), to: new Date("2025-01-31") };
    const result = computeDeliverableMetrics(deliverables, range);

    expect(result.total).toBe(1);
    expect(result.verifiedCount).toBe(1);
  });

  it("handles single record edge case", () => {
    const deliverables: DeliverableLike[] = [
      { status: "verified", dueDate: "2025-01-15", completedDate: "2025-01-10" },
    ];

    const result = computeDeliverableMetrics(deliverables);
    expect(result.completionRate).toBe(100);
    expect(result.onTimeRate).toBe(100);
  });
});

describe("getStatusColor", () => {
  it("returns valid hex colors for all statuses", () => {
    const statuses = ["pending", "in_progress", "submitted", "verified", "missed", "unknown"];
    for (const status of statuses) {
      expect(getStatusColor(status)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
